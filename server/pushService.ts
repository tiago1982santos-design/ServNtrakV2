import webpush from "web-push";
import { db } from "./db";
import { pushSubscriptions, pushSendEvents } from "@shared/schema";
import { eq, and, desc, gte, lt, sql } from "drizzle-orm";

const VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY ?? "").trim();
const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
const VAPID_EMAIL_RAW = process.env.VAPID_EMAIL?.trim();
const VAPID_EMAIL =
  VAPID_EMAIL_RAW && /^(mailto:|https?:\/\/)/i.test(VAPID_EMAIL_RAW)
    ? VAPID_EMAIL_RAW
    : "mailto:servntrak@peralta.pt";

if (VAPID_EMAIL_RAW && VAPID_EMAIL_RAW !== VAPID_EMAIL) {
  console.warn(
    "[pushService] VAPID_EMAIL ignorado (não é um URL mailto:/https:// válido). A usar valor por omissão.",
  );
}

let pushEnabled = false;
let vapidConfigError: string | null = null;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    pushEnabled = true;
    console.log("[pushService] Notificações push ativadas (VAPID configurada).");
  } catch (err: any) {
    vapidConfigError = err?.message || String(err);
    console.warn(
      "[pushService] Notificações push desativadas: configuração VAPID inválida —",
      vapidConfigError,
    );
  }
} else {
  vapidConfigError = "VAPID_PUBLIC_KEY e/ou VAPID_PRIVATE_KEY em falta nos Secrets.";
  console.warn(
    "[pushService] Notificações push desativadas: VAPID_PUBLIC_KEY e/ou VAPID_PRIVATE_KEY em falta nos Secrets.",
  );
}

export function isPushEnabled(): boolean {
  return pushEnabled;
}

const RECENT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PRUNE_INTERVAL_MS = 60 * 60 * 1000; // hourly

type FailureKind = "auth" | "gone" | "other";

async function recordSendEvent(event: {
  status: "success" | "failure";
  endpointPreview: string;
  statusCode: number | null;
  kind: FailureKind | null;
  message: string | null;
}): Promise<void> {
  try {
    await db.insert(pushSendEvents).values({
      status: event.status,
      kind: event.kind,
      statusCode: event.statusCode,
      endpointPreview: event.endpointPreview,
      message: event.message,
    });
  } catch (err) {
    console.warn(
      "[pushService] Falha ao registar evento push em DB:",
      (err as Error)?.message || err,
    );
  }
}

let lastPruneAt = 0;

async function pruneOldEvents(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  try {
    const cutoff = new Date(now - RETENTION_MS);
    await db.delete(pushSendEvents).where(lt(pushSendEvents.at, cutoff));
  } catch (err) {
    console.warn(
      "[pushService] Falha ao limpar eventos push antigos:",
      (err as Error)?.message || err,
    );
  }
}

// Schedule background cleanup so retention is enforced even if the health
// endpoint isn't being polled.
setInterval(() => {
  void pruneOldEvents(true);
}, PRUNE_INTERVAL_MS).unref?.();

export type PushFailureSummary = {
  at: number;
  statusCode: number | null;
  kind: FailureKind;
};

export type PushHealthStatus = {
  enabled: boolean;
  configError: string | null;
  totals: { sent: number; failed: number; authFailed: number };
  lastSuccessAt: number | null;
  lastFailure: PushFailureSummary | null;
  lastAuthFailure: PushFailureSummary | null;
  recentWindowMinutes: number;
  recentFailureCount: number;
  recentAuthFailureCount: number;
  hasActiveVapidProblem: boolean;
};

export async function getPushHealthStatus(): Promise<PushHealthStatus> {
  // Best-effort cleanup so old rows don't skew counters.
  await pruneOldEvents();

  const now = Date.now();
  const recentCutoff = new Date(now - RECENT_WINDOW_MS);
  const retentionCutoff = new Date(now - RETENTION_MS);

  let totalSent = 0;
  let totalFailed = 0;
  let totalAuthFailed = 0;
  let recentFailureCount = 0;
  let recentAuthFailureCount = 0;
  let lastSuccessAt: number | null = null;
  let lastFailure: PushFailureSummary | null = null;
  let lastAuthFailure: PushFailureSummary | null = null;

  try {
    // Totals within the retention window grouped by status + kind.
    const totalsRows = await db
      .select({
        status: pushSendEvents.status,
        kind: pushSendEvents.kind,
        count: sql<number>`count(*)::int`,
      })
      .from(pushSendEvents)
      .where(gte(pushSendEvents.at, retentionCutoff))
      .groupBy(pushSendEvents.status, pushSendEvents.kind);

    for (const row of totalsRows) {
      if (row.status === "success") {
        totalSent += row.count;
      } else if (row.status === "failure") {
        totalFailed += row.count;
        if (row.kind === "auth") totalAuthFailed += row.count;
      }
    }

    // Recent failures (last hour) grouped by kind.
    const recentRows = await db
      .select({
        kind: pushSendEvents.kind,
        count: sql<number>`count(*)::int`,
      })
      .from(pushSendEvents)
      .where(
        and(
          eq(pushSendEvents.status, "failure"),
          gte(pushSendEvents.at, recentCutoff),
        ),
      )
      .groupBy(pushSendEvents.kind);

    for (const row of recentRows) {
      recentFailureCount += row.count;
      if (row.kind === "auth") recentAuthFailureCount += row.count;
    }

    const [lastSuccessRow] = await db
      .select({ at: pushSendEvents.at })
      .from(pushSendEvents)
      .where(eq(pushSendEvents.status, "success"))
      .orderBy(desc(pushSendEvents.at))
      .limit(1);
    lastSuccessAt = lastSuccessRow?.at ? lastSuccessRow.at.getTime() : null;

    const [lastFailureRow] = await db
      .select({
        at: pushSendEvents.at,
        statusCode: pushSendEvents.statusCode,
        kind: pushSendEvents.kind,
      })
      .from(pushSendEvents)
      .where(eq(pushSendEvents.status, "failure"))
      .orderBy(desc(pushSendEvents.at))
      .limit(1);
    if (lastFailureRow?.at) {
      lastFailure = {
        at: lastFailureRow.at.getTime(),
        statusCode: lastFailureRow.statusCode,
        kind: ((lastFailureRow.kind as FailureKind | null) ?? "other"),
      };
    }

    const [lastAuthRow] = await db
      .select({
        at: pushSendEvents.at,
        statusCode: pushSendEvents.statusCode,
      })
      .from(pushSendEvents)
      .where(
        and(
          eq(pushSendEvents.status, "failure"),
          eq(pushSendEvents.kind, "auth"),
        ),
      )
      .orderBy(desc(pushSendEvents.at))
      .limit(1);
    if (lastAuthRow?.at) {
      lastAuthFailure = {
        at: lastAuthRow.at.getTime(),
        statusCode: lastAuthRow.statusCode,
        kind: "auth",
      };
    }
  } catch (err) {
    console.warn(
      "[pushService] Falha ao ler histórico de eventos push:",
      (err as Error)?.message || err,
    );
  }

  const lastAuthIsRecent =
    !!lastAuthFailure && now - lastAuthFailure.at < RECENT_WINDOW_MS;
  const lastSuccessAfterAuth =
    !!lastSuccessAt && !!lastAuthFailure && lastSuccessAt > lastAuthFailure.at;
  const hasActiveVapidProblem =
    !pushEnabled ||
    (lastAuthIsRecent && !lastSuccessAfterAuth) ||
    recentAuthFailureCount > 0;

  return {
    enabled: pushEnabled,
    configError: vapidConfigError,
    totals: { sent: totalSent, failed: totalFailed, authFailed: totalAuthFailed },
    lastSuccessAt,
    lastFailure,
    lastAuthFailure,
    recentWindowMinutes: Math.round(RECENT_WINDOW_MS / 60000),
    recentFailureCount,
    recentAuthFailureCount,
    hasActiveVapidProblem,
  };
}

export async function saveSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  deviceInfo?: string
): Promise<void> {
  await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      deviceInfo: deviceInfo || null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        deviceInfo: deviceInfo || null,
      },
    });
}

export async function removeSubscription(endpoint: string, userId?: string): Promise<void> {
  if (userId) {
    await db.delete(pushSubscriptions).where(
      and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId))
    );
  } else {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }
}

const MAX_SEND_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 500;

function isTransientPushError(err: any): boolean {
  const statusCode = err?.statusCode;
  if (typeof statusCode === "number") {
    return statusCode >= 500 && statusCode < 600;
  }
  const code = err?.code;
  if (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "EPIPE" ||
    code === "UND_ERR_SOCKET" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "UND_ERR_HEADERS_TIMEOUT" ||
    code === "UND_ERR_BODY_TIMEOUT"
  ) {
    return true;
  }
  const name = err?.name;
  if (name === "TimeoutError" || name === "AbortError") return true;
  const message = typeof err?.message === "string" ? err.message.toLowerCase() : "";
  if (message.includes("timeout") || message.includes("timed out")) return true;
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendPushToUser(
  userId: string,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
    appointmentId?: number;
    actions?: { action: string; title: string }[];
  }
): Promise<{ sent: number; failed: number }> {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    const endpointPreview =
      sub.endpoint.length > 80
        ? `${sub.endpoint.slice(0, 60)}...${sub.endpoint.slice(-16)}`
        : sub.endpoint;

    let lastError: any = null;
    let delivered = false;

    for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
        delivered = true;
        if (attempt > 1) {
          console.info(
            `[pushService] Reenvio bem-sucedido (tentativa ${attempt}/${MAX_SEND_ATTEMPTS}) para userId=${userId} endpoint=${endpointPreview}.`,
          );
        }
        break;
      } catch (err: any) {
        lastError = err;
        const transient = isTransientPushError(err);
        if (transient && attempt < MAX_SEND_ATTEMPTS) {
          const waitMs = RETRY_BASE_DELAY_MS * attempt;
          const statusCode = err?.statusCode;
          console.warn(
            `[pushService] Erro transiente ao enviar push (tentativa ${attempt}/${MAX_SEND_ATTEMPTS}) para userId=${userId} endpoint=${endpointPreview} statusCode=${statusCode ?? "n/a"}. A retentar em ${waitMs}ms.`,
          );
          await delay(waitMs);
          continue;
        }
        break;
      }
    }

    if (delivered) {
      sent++;
      await recordSendEvent({
        status: "success",
        endpointPreview,
        statusCode: null,
        kind: null,
        message: null,
      });
      continue;
    }

    const err = lastError;
    const statusCode = err?.statusCode;
    const errorBody =
      typeof err?.body === "string"
        ? err.body.slice(0, 500)
        : err?.body
          ? JSON.stringify(err.body).slice(0, 500)
          : err?.message || String(err);

    let kind: FailureKind = "other";
    if (statusCode === 410 || statusCode === 404) {
      kind = "gone";
      await removeSubscription(sub.endpoint);
      console.info(
        `[pushService] Subscrição removida (${statusCode}) para userId=${userId} endpoint=${endpointPreview}. Detalhe: ${errorBody}`,
      );
    } else if (statusCode === 401 || statusCode === 403) {
      kind = "auth";
      console.error(
        `[pushService] FALHA DE AUTENTICAÇÃO VAPID (${statusCode}) ao enviar push para userId=${userId} endpoint=${endpointPreview}. ` +
          `Verifica os Secrets VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY (e VAPID_EMAIL): provavelmente as chaves estão erradas, desemparelhadas ou foram regeradas. ` +
          `Detalhe: ${errorBody}`,
      );
    } else {
      console.warn(
        `[pushService] Falha ao enviar push para userId=${userId} endpoint=${endpointPreview} statusCode=${statusCode ?? "n/a"} (após ${MAX_SEND_ATTEMPTS} tentativa(s)). Detalhe: ${errorBody}`,
      );
    }
    failed++;
    await recordSendEvent({
      status: "failure",
      endpointPreview,
      statusCode: typeof statusCode === "number" ? statusCode : null,
      kind,
      message: errorBody,
    });
  }

  return { sent, failed };
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
