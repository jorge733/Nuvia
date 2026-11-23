import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { expand } from "@/lib/time";
import { CATEGORIES } from "@/lib/format";
import { icsDate, icsDay, icsEsc as esc, icsFold as fold } from "@/lib/ics";

type FeedRow = {
  id: string;
  family_name: string;
  title: string;
  notes: string | null;
  location: string | null;
  category: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  recurrence: string;
  recur_interval: number;
  recur_until: string | null;
  recur_days?: number[] | null;
  responsible_name: string | null;
  skipped: string[];
  overrides: Record<string, string>;
};

// Suscripción de calendario personal (Google Calendar, Apple Calendar, Outlook).
export async function GET(_req: Request, ctx: RouteContext<"/api/calendario/[token]">) {
  const { token } = await ctx.params;
  if (!/^[a-f0-9]{48}$/.test(token)) return new Response("No encontrado", { status: 404 });

  const supabase = createClient(supabaseUrl(), supabaseKey(), { auth: { persistSession: false } });
  const now = Date.now();
  const from = new Date(now - 60 * 86400000);
  const to = new Date(now + 365 * 86400000);
  const { data, error } = await supabase.rpc("calendar_feed", { p_token: token, p_from: from.toISOString(), p_to: to.toISOString() });
  if (error) return new Response("Error", { status: 500 });
  const rows = (data as FeedRow[] | null) ?? [];

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Uniluva//Agenda familiar//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Uniluva",
    "X-WR-TIMEZONE:America/Santiago",
    "REFRESH-INTERVAL;VALUE=DURATION:PT3H",
    "X-PUBLISHED-TTL:PT3H",
  ];

  for (const ev of rows) {
    const skipped = new Set(ev.skipped.map((s) => new Date(s).getTime()));
    const overrides = new Map(Object.entries(ev.overrides).map(([k, v]) => [new Date(k).getTime(), v]));
    const emoji = CATEGORIES[ev.category]?.emoji ?? "";
    for (const occ of expand(ev, from, to)) {
      const t = occ.start.getTime();
      if (skipped.has(t)) continue;
      const who = overrides.get(t) ?? ev.responsible_name;
      const description = [who ? `A cargo de: ${who}` : "Sin responsable asignado", ev.notes, `Familia: ${ev.family_name}`].filter(Boolean).join("\n\n");
      lines.push("BEGIN:VEVENT", `UID:${ev.id}-${t}@uniluva.com`, `DTSTAMP:${icsDate(new Date())}`);
      if (ev.all_day) {
        lines.push(`DTSTART;VALUE=DATE:${icsDay(occ.start)}`);
        lines.push(`DTEND;VALUE=DATE:${icsDay(new Date(t + 86400000 + 3600000))}`);
      } else {
        lines.push(`DTSTART:${icsDate(occ.start)}`, `DTEND:${icsDate(occ.end ?? new Date(t + 3600000))}`);
      }
      lines.push(
        `SUMMARY:${esc(`${emoji} ${ev.title}${who ? ` · ${who}` : ""}`.trim())}`,
        `DESCRIPTION:${esc(description)}`,
        ...(ev.location ? [`LOCATION:${esc(ev.location)}`] : []),
        "BEGIN:VALARM",
        `TRIGGER:${ev.all_day ? "-PT15H" : "-PT1H"}`,
        "ACTION:DISPLAY",
        `DESCRIPTION:${esc(ev.title)}`,
        "END:VALARM",
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.map(fold).join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="uniluva.ics"',
      "Cache-Control": "private, max-age=900",
    },
  });
}
