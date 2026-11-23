import { getGuestEvent } from "@/lib/guest";
import { CATEGORIES } from "@/lib/format";
import { capitalize, dayKey, formatDay, timeOf } from "@/lib/time";
import { OG_SIZE, renderEventOg, renderOg } from "@/lib/og";

export const alt = "Invitación a una actividad en Uniluva";
export const size = OG_SIZE;
export const contentType = "image/png";

// Vista previa del enlace de invitación: la actividad con su fecha y lugar.
export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const ev = await getGuestEvent((await params).token);
  if (!ev) {
    return renderOg({ eyebrow: "Te invitaron", title: "Una actividad en Uniluva.", subtitle: "Abre el enlace para ver los detalles." });
  }
  const start = new Date(ev.starts_at);
  const day = capitalize(formatDay(dayKey(start)));
  const when = ev.all_day ? `${day} · todo el día` : `${day} · ${timeOf(start)}${ev.ends_at ? `–${timeOf(new Date(ev.ends_at))}` : ""}`;
  return renderEventOg({
    eyebrow: `${ev.inviter ? `${ev.inviter} te invitó` : "Te invitaron"}${ev.family_name ? ` · ${ev.family_name}` : ""}`,
    emoji: CATEGORIES[ev.category]?.emoji ?? "📌",
    title: ev.title,
    when,
    where: ev.location,
  });
}
