import Link from "next/link";
import { getFamily } from "@/lib/family";
import { groupByDay, loadAgenda } from "@/lib/agenda";
import { addDays, capitalize, formatDay, isDayKey, relativeDay, startOfDay, startOfWeek, todayKey } from "@/lib/time";
import { Flash } from "@/components/ui";
import { OccurrenceRow } from "@/components/occurrence-row";

export const metadata = { title: "Semana" };

export default async function Semana({ params, searchParams }: PageProps<"/f/[id]/semana">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, me, byId, user } = await getFamily(id);

  const today = todayKey();
  const monday = startOfWeek(isDayKey(sp.d) ? sp.d : today);
  const ver = sp.ver === "yo" ? "yo" : "todos";
  let list = await loadAgenda(supabase, id, startOfDay(monday), startOfDay(addDays(monday, 7)));
  if (ver === "yo") {
    list = list.filter(
      (o) => o.responsibleId === me.id || o.event.participant_ids.includes(me.id) || (o.event.created_by === user.id && o.event.visibility !== "familia"),
    );
  }
  const days = groupByDay(list);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const q = (d: string, v = ver) => `/f/${id}/semana?d=${d}${v === "yo" ? "&ver=yo" : ""}`;
  const range = `${formatDay(monday, { day: "numeric", month: "short" })} – ${formatDay(addDays(monday, 6), { day: "numeric", month: "short" })}`;

  return (
    <div>
      <Flash ok={typeof sp.ok === "string" && sp.ok ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Semana</h1>
          <p className="text-sm text-muted">{range}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link href={q(addDays(monday, -7))} className="btn-secondary px-3" aria-label="Semana anterior">
            ←
          </Link>
          <Link href={q(today)} className="btn-secondary px-3">
            Hoy
          </Link>
          <Link href={q(addDays(monday, 7))} className="btn-secondary px-3" aria-label="Semana siguiente">
            →
          </Link>
        </div>
      </div>

      <div className="mb-5 inline-flex rounded-full bg-surface-2 p-1 text-sm">
        <Link href={q(monday, "todos")} className={`rounded-full px-4 py-1.5 font-medium ${ver === "todos" ? "bg-surface shadow-sm" : "text-muted"}`}>
          Toda la familia
        </Link>
        <Link href={q(monday, "yo")} className={`rounded-full px-4 py-1.5 font-medium ${ver === "yo" ? "bg-surface shadow-sm" : "text-muted"}`}>
          Solo lo mío
        </Link>
      </div>

      <div className="space-y-3">
        {week.map((d) => {
          const items = days.get(d) ?? [];
          const isToday = d === today;
          return (
            <section key={d} className={`card p-0 sm:p-0 ${isToday ? "border-accent" : ""} ${d < today ? "opacity-70" : ""}`}>
              <div className="flex items-center justify-between border-b border-line px-4 py-2">
                <h2 className={`text-sm font-semibold ${isToday ? "text-accent" : ""}`}>
                  {["Hoy", "Mañana", "Ayer"].includes(relativeDay(d, today)) ? `${relativeDay(d, today)} · ` : ""}
                  {capitalize(formatDay(d, { weekday: "long", day: "numeric" }))}
                </h2>
                <Link href={`/f/${id}/nuevo?fecha=${d}`} className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-surface-2 hover:text-fg" aria-label={`Agregar el ${d}`}>
                  ＋
                </Link>
              </div>
              {items.length ? (
                <div className="divide-y divide-line">
                  {items.map((o) => (
                    <OccurrenceRow key={o.key} familyId={id} o={o} byId={byId} />
                  ))}
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-muted">Libre</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
