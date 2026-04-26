export interface WorkingHoursSettings {
  start: number;
  end: number;
  lunchEnabled: boolean;
  lunchStart: number;
  lunchEnd: number;
}

export const DEFAULT_WORKING_HOURS: WorkingHoursSettings = {
  start: 8,
  end: 18,
  lunchEnabled: false,
  lunchStart: 12,
  lunchEnd: 14,
};

const STORAGE_KEY = "servntrak-working-hours";
const CHANGE_EVENT = "servntrak-working-hours-change";

function clampHour(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function normalize(raw: Partial<WorkingHoursSettings> | null | undefined): WorkingHoursSettings {
  const start = clampHour(raw?.start, DEFAULT_WORKING_HOURS.start, 0, 23);
  const endRaw = clampHour(raw?.end, DEFAULT_WORKING_HOURS.end, 0, 23);
  const end = endRaw < start ? start : endRaw;
  const lunchStartRaw = clampHour(raw?.lunchStart, DEFAULT_WORKING_HOURS.lunchStart, 0, 23);
  const lunchEndRaw = clampHour(raw?.lunchEnd, DEFAULT_WORKING_HOURS.lunchEnd, 1, 24);
  const lunchStart = lunchStartRaw;
  const lunchEnd = lunchEndRaw <= lunchStart ? lunchStart + 1 : lunchEndRaw;
  return {
    start,
    end,
    lunchEnabled: Boolean(raw?.lunchEnabled),
    lunchStart,
    lunchEnd,
  };
}

export function loadWorkingHours(): WorkingHoursSettings {
  if (typeof window === "undefined") return DEFAULT_WORKING_HOURS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WORKING_HOURS;
    return normalize(JSON.parse(raw));
  } catch {
    return DEFAULT_WORKING_HOURS;
  }
}

export function saveWorkingHours(settings: WorkingHoursSettings): WorkingHoursSettings {
  const normalized = normalize(settings);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {}
  return normalized;
}

export function subscribeToWorkingHours(listener: () => void): () => void {
  const onChange = () => listener();
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function computeWorkingHours(settings: WorkingHoursSettings): number[] {
  const out: number[] = [];
  for (let h = settings.start; h <= settings.end; h++) {
    if (settings.lunchEnabled && h >= settings.lunchStart && h < settings.lunchEnd) continue;
    out.push(h);
  }
  return out;
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
