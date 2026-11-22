import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => "\\" + m);
}

// Archivo .ics para agregar la reunión a cualquier calendario (Google, Apple, Outlook).
export async function GET(_req: NextRequest, ctx: RouteContext<"/c/[id]/reuniones/[meetingId]/ics">) {
  const { id, meetingId } = await ctx.params;
  const supabase = await createClient();
  const [{ data: m }, { data: c }] = await Promise.all([
    supabase.from("meetings").select("id, title, starts_at, location, online_url, agenda").eq("id", meetingId).eq("community_id", id).maybeSingle(),
    supabase.from("communities").select("name").eq("id", id).maybeSingle(),
  ]);
  if (!m) return new Response("No encontrada", { status: 404 });

  const start = new Date(m.starts_at);
  const end = new Date(start.getTime() + 2 * 3600_000);
  const description = [m.agenda, m.online_url ? `Enlace: ${m.online_url}` : null].filter(Boolean).join("\n\n");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Uniluva//Reuniones//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${m.id}@uniluva.com`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(`${m.title} · ${c?.name ?? "Uniluva"}`)}`,
    m.location ? `LOCATION:${esc(m.location)}` : null,
    description ? `DESCRIPTION:${esc(description)}` : null,
    m.online_url ? `URL:${m.online_url}` : null,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio de reunión",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="reunion-${m.id.slice(0, 8)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
