// Utilidades para archivos de calendario (.ics, RFC 5545).
import { fromLocal, keyParts, localParts, TZ } from "./time";

export const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export const icsDay = (d: Date) => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return p.replace(/-/g, "");
};

/** Fecha y hora local de Chile (para usar con TZID, así las repeticiones respetan el cambio de hora). */
const icsLocal = (d: Date) => {
  const p = localParts(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}${pad(p.m)}${pad(p.d)}T${pad(p.hh)}${pad(p.mi)}00`;
};

export const icsEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, (m) => "\\" + m);

// Líneas de máximo 75 octetos.
export const icsFold = (line: string) => {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > 74) {
      out.push(cur);
      cur = " " + ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
};

const FREQ: Record<string, string> = {
  diaria: "FREQ=DAILY",
  dias_habiles: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  semanal: "FREQ=WEEKLY",
  mensual: "FREQ=MONTHLY",
  anual: "FREQ=YEARLY",
};

export type IcsEvent = {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  recurrence: string;
  recur_interval?: number;
  recur_until?: string | null;
  skipped?: string[];
};

/** Un archivo .ics con una sola actividad (con su repetición). */
export function singleEventIcs(ev: IcsEvent) {
  const start = new Date(ev.starts_at);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Uniluva//Agenda familiar//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT"];
  lines.push(`UID:${ev.uid}@uniluva.com`, `DTSTAMP:${icsDate(new Date())}`);
  if (ev.all_day) {
    lines.push(`DTSTART;VALUE=DATE:${icsDay(start)}`, `DTEND;VALUE=DATE:${icsDay(new Date(start.getTime() + 86400000 + 3600000))}`);
  } else {
    const end = ev.ends_at ? new Date(ev.ends_at) : new Date(start.getTime() + 3600000);
    lines.push(`DTSTART;TZID=${TZ}:${icsLocal(start)}`, `DTEND;TZID=${TZ}:${icsLocal(end)}`);
  }
  const freq = FREQ[ev.recurrence];
  if (freq) {
    const interval = ev.recur_interval && ev.recur_interval > 1 ? `;INTERVAL=${ev.recur_interval}` : "";
    // Hasta el final de ese día en Chile (UNTIL va en UTC).
    const u = ev.recur_until ? keyParts(ev.recur_until) : null;
    const until = u ? `;UNTIL=${icsDate(fromLocal(u.y, u.m, u.d, 23, 59))}` : "";
    lines.push(`RRULE:${freq}${interval}${until}`);
    for (const s of ev.skipped ?? []) {
      const d = new Date(s);
      lines.push(ev.all_day ? `EXDATE;VALUE=DATE:${icsDay(d)}` : `EXDATE;TZID=${TZ}:${icsLocal(d)}`);
    }
  }
  lines.push(`SUMMARY:${icsEsc(ev.title)}`);
  if (ev.description) lines.push(`DESCRIPTION:${icsEsc(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${icsEsc(ev.location)}`);
  lines.push("BEGIN:VALARM", `TRIGGER:${ev.all_day ? "-PT15H" : "-PT1H"}`, "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(ev.title)}`, "END:VALARM");
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(icsFold).join("\r\n");
}
