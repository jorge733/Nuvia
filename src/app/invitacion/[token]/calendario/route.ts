import { getGuestEvent } from "@/lib/guest";
import { singleEventIcs } from "@/lib/ics";

// La actividad como archivo .ics, para agregarla al calendario del invitado.
export async function GET(_req: Request, ctx: RouteContext<"/invitacion/[token]/calendario">) {
  const { token } = await ctx.params;
  const ev = await getGuestEvent(token);
  if (!ev) return new Response("No encontrado", { status: 404 });
  const ics = singleEventIcs({
    uid: `invitado-${ev.event_id}`,
    title: ev.title,
    description: [ev.notes, ev.inviter ? `Te invitó ${ev.inviter} desde Uniluva.` : "Invitación de Uniluva."].filter(Boolean).join("\n\n"),
    location: ev.location,
    starts_at: ev.starts_at,
    ends_at: ev.ends_at,
    all_day: ev.all_day,
    recurrence: ev.recurrence,
    recur_interval: ev.recur_interval,
    recur_until: ev.recur_until,
    skipped: ev.skipped,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="invitacion.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
