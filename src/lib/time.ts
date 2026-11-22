// Fechas en hora de Chile (America/Santiago), con cambios de horario incluidos.
export const TZ = "America/Santiago";

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export type LocalParts = { y: number; m: number; d: number; hh: number; mi: number };

export function localParts(date: Date): LocalParts {
  const p = Object.fromEntries(partsFmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour % 24, mi: +p.minute };
}

const pad = (n: number) => String(n).padStart(2, "0");

function offsetMinutes(utcMs: number) {
  const p = localParts(new Date(utcMs));
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mi);
  return Math.round((asUtc - Math.floor(utcMs / 60000) * 60000) / 60000);
}

/** Fecha/hora local de Chile → instante (Date). */
export function fromLocal(y: number, m: number, d: number, hh = 0, mi = 0) {
  const guess = Date.UTC(y, m - 1, d, hh, mi);
  const off = offsetMinutes(guess);
  let t = guess - off * 60000;
  const off2 = offsetMinutes(t);
  if (off2 !== off) t = guess - off2 * 60000;
  return new Date(t);
}

/** "YYYY-MM-DD" del día local. */
export function dayKey(date: Date) {
  const p = localParts(date);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

export function todayKey() {
  return dayKey(new Date());
}

export function isDayKey(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export function keyParts(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

function keyToUtcDays(key: string) {
  const { y, m, d } = keyParts(key);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function utcDaysToKey(days: number) {
  const dt = new Date(days * 86400000);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(key: string, n: number) {
  return utcDaysToKey(keyToUtcDays(key) + n);
}

export function diffDays(a: string, b: string) {
  return keyToUtcDays(a) - keyToUtcDays(b);
}

/** 0 = domingo … 6 = sábado */
export function weekday(key: string) {
  return new Date(keyToUtcDays(key) * 86400000).getUTCDay();
}

/** Lunes de la semana del día dado. */
export function startOfWeek(key: string) {
  return addDays(key, -((weekday(key) + 6) % 7));
}

export function startOfDay(key: string) {
  const { y, m, d } = keyParts(key);
  return fromLocal(y, m, d, 0, 0);
}

export function timeOf(date: Date) {
  const p = localParts(date);
  return `${pad(p.hh)}:${pad(p.mi)}`;
}

// ─── Formatos ──────────────────────────────────────────────────

export function formatDay(key: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  const { y, m, d } = keyParts(key);
  return new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", ...opts }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Hoy", "Mañana", "Ayer" o "jueves 27 de noviembre". */
export function relativeDay(key: string, today = todayKey()) {
  const diff = diffDays(key, today);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return capitalize(formatDay(key));
}

export function formatWhen(start: Date, allDay: boolean, end?: Date | null) {
  const day = relativeDay(dayKey(start));
  if (allDay) return `${day} · todo el día`;
  return `${day} · ${timeOf(start)}${end ? `–${timeOf(end)}` : ""}`;
}

// ─── Repeticiones ──────────────────────────────────────────────

export type Recurring = {
  starts_at: string;
  ends_at: string | null;
  recurrence: string;
  recur_interval: number;
  recur_until: string | null;
};

const MAX_STEPS = 1500;

/** Repeticiones de un evento que se cruzan con [from, to]. */
export function expand(ev: Recurring, from: Date, to: Date): { start: Date; end: Date | null }[] {
  const s = new Date(ev.starts_at);
  const dur = ev.ends_at ? new Date(ev.ends_at).getTime() - s.getTime() : null;
  const make = (start: Date) => ({ start, end: dur !== null ? new Date(start.getTime() + dur) : null });
  const overlaps = (o: { start: Date; end: Date | null }) => o.start <= to && (o.end ?? o.start) >= from;

  if (ev.recurrence === "none") {
    const o = make(s);
    return overlaps(o) ? [o] : [];
  }

  const base = localParts(s);
  const baseKey = dayKey(s);
  const until = ev.recur_until;
  const interval = Math.max(1, ev.recur_interval || 1);
  const out: { start: Date; end: Date | null }[] = [];
  const fromKey = addDays(dayKey(from), -Math.ceil((dur ?? 0) / 86400000) - 1);
  const toKey = dayKey(to);

  const push = (key: string) => {
    const { y, m, d } = keyParts(key);
    const o = make(fromLocal(y, m, d, base.hh, base.mi));
    if (overlaps(o)) out.push(o);
  };

  if (ev.recurrence === "diaria" || ev.recurrence === "semanal" || ev.recurrence === "dias_habiles") {
    const step = ev.recurrence === "semanal" ? 7 * interval : ev.recurrence === "diaria" ? interval : 1;
    let i = Math.max(0, Math.floor(diffDays(fromKey, baseKey) / step));
    for (let n = 0; n < MAX_STEPS; n++, i++) {
      const key = addDays(baseKey, i * step);
      if (key > toKey || (until && key > until)) break;
      if (ev.recurrence === "dias_habiles" && (weekday(key) === 0 || weekday(key) === 6)) continue;
      push(key);
    }
  } else if (ev.recurrence === "mensual" || ev.recurrence === "anual") {
    const stepMonths = ev.recurrence === "anual" ? 12 * interval : interval;
    const fk = keyParts(fromKey);
    const monthsToFrom = (fk.y - base.y) * 12 + (fk.m - base.m);
    let i = Math.max(0, Math.floor(monthsToFrom / stepMonths) - 1);
    for (let n = 0; n < MAX_STEPS; n++, i++) {
      const total = base.m - 1 + i * stepMonths;
      const y = base.y + Math.floor(total / 12);
      const m = (total % 12) + 1;
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const key = `${y}-${pad(m)}-${pad(Math.min(base.d, 31))}`;
      if (key.slice(0, 7) > toKey.slice(0, 7) || (until && key > until)) break;
      if (base.d > daysInMonth) continue; // ej.: 31 en meses de 30 días, 29-feb en años no bisiestos
      push(key);
    }
  }
  return out;
}

export const RECURRENCE_LABEL: Record<string, string> = {
  none: "No se repite",
  diaria: "Todos los días",
  dias_habiles: "De lunes a viernes",
  semanal: "Cada semana",
  mensual: "Cada mes",
  anual: "Cada año",
};

/** Instante actual (función aparte para usarla en Server Components). */
export function nowMs() {
  return Date.now();
}
