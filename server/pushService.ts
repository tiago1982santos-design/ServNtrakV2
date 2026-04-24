import webpush from "web-push";
import { db } from "./db";
import { pushSubscriptions } from "@shared/schema";
import { eq, and } from "drizzle-orm";

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

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    pushEnabled = true;
    console.log("[pushService] Notificações push ativadas (VAPID configurada).");
  } catch (err: any) {
    console.warn(
      "[pushService] Notificações push desativadas: configuração VAPID inválida —",
      err?.message || err,
    );
  }
} else {
  console.warn(
    "[pushService] Notificações push desativadas: VAPID_PUBLIC_KEY e/ou VAPID_PRIVATE_KEY em falta nos Secrets.",
  );
}

export function isPushEnabled(): boolean {
  return pushEnabled;
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
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: any) {
      const statusCode = err?.statusCode;
      const endpointPreview =
        sub.endpoint.length > 80
          ? `${sub.endpoint.slice(0, 60)}...${sub.endpoint.slice(-16)}`
          : sub.endpoint;
      const errorBody =
        typeof err?.body === "string"
          ? err.body.slice(0, 500)
          : err?.body
            ? JSON.stringify(err.body).slice(0, 500)
            : err?.message || String(err);

      if (statusCode === 410 || statusCode === 404) {
        await removeSubscription(sub.endpoint);
        console.info(
          `[pushService] Subscrição removida (${statusCode}) para userId=${userId} endpoint=${endpointPreview}. Detalhe: ${errorBody}`,
        );
      } else if (statusCode === 401 || statusCode === 403) {
        console.error(
          `[pushService] FALHA DE AUTENTICAÇÃO VAPID (${statusCode}) ao enviar push para userId=${userId} endpoint=${endpointPreview}. ` +
            `Verifica os Secrets VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY (e VAPID_EMAIL): provavelmente as chaves estão erradas, desemparelhadas ou foram regeradas. ` +
            `Detalhe: ${errorBody}`,
        );
      } else {
        console.warn(
          `[pushService] Falha ao enviar push para userId=${userId} endpoint=${endpointPreview} statusCode=${statusCode ?? "n/a"}. Detalhe: ${errorBody}`,
        );
      }
      failed++;
    }
  }

  return { sent, failed };
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
