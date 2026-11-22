import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getFamily } from "@/lib/family";
import { groupByDay, loadAgenda } from "@/lib/agenda";
import { addDays, capitalize, formatDay, isDayKey, keyParts, relativeDay, startOfDay, startOfWeek, todayKey } from "@/lib/time";
import { Flash } from "@/components/ui";
import { OccurrenceRow } from "@/components/occurrence-row";
import { memberHex } from "@/components/member-avatar";

export const metadata = { title: "Semana" };

const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

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
  const monthLabel = capitalize(formatDay(monday, { month: "long", year: "numeric" }));

  return (
    <div>
      <Flash ok={typeof sp.ok === "string" && sp.ok ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />

      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{monthLabel}</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Semana</h1>
        </div>
        <div className="flex items-center gap-1">
          <Link href={q(addDays(monday, -7))} className="btn-ghost size-11 px-0" aria-label="Semana anterior">
            <ChevronLeft className="size-5" />
          </Link>
          <Link href={q(today)} className="btn-secondary min-h-10 px-4 py-1.5">
            Hoy
          </Link>
          <Link href={q(addDays(monday, 7))} className="btn-ghost size-11 px-0" aria-label="Semana siguiente">
            <ChevronRight className="size-5" />
          </Link>
        </div>
      </div>

      {/* Tira de días con puntos del color de quien se encarga */}
      <div className="card mb-5 grid grid-cols-7 gap-1 p-2">
        {week.map((d, i) => {
          const items = days.get(d) ?? [];
          const isToday = d === today;
          return (
            <a
              key={d}
              href={`#d-${d}`}
              className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 transition ${isToday ? "bg-accent text-accent-fg" : "hover:bg-surface-2"}`}
            >
              <span className={`text-[11px] font-bold ${isToday ? "opacity-80" : "text-muted"}`}>{LETTERS[i]}</span>
              <span className="font-display text-lg leading-none font-semibold">{keyParts(d).d}</span>
              <span className="flex h-1.5 gap-0.5">
                {items.slice(0, 4).map((o) => (
                  <span
                    key={o.key}
                    className="size-1.5 rounded-full"
                    style={{ background: isToday ? "currentColor" : (memberHex(o.responsibleId ? byId[o.responsibleId] : null) ?? "var(--sun)") }}
                  />
                ))}
              </span>
            </a>
          );
        })}
      </div>

      <div className="mb-6 inline-flex rounded-full bg-surface-2 p-1 text-sm font-semibold">
        <Link href={q(monday, "todos")} className={`rounded-full px-4 py-2 transition ${ver === "todos" ? "bg-surface shadow-soft" : "text-muted"}`}>
          Toda la familia
        </Link>
        <Link href={q(monday, "yo")} className={`rounded-full px-4 py-2 transition ${ver === "yo" ? "bg-surface shadow-soft" : "text-muted"}`}>
          Solo lo mío
        </Link>
      </div>

      <div className="space-y-6">
        {week.map((d) => {
          const items = days.get(d) ?? [];
          const isToday = d === today;
          const rel = relativeDay(d, today);
          return (
            <section key={d} id={`d-${d}`} className={`scroll-mt-36 ${d < today ? "opacity-60" : ""}`}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className={`text-lg font-semibold ${isToday ? "text-accent" : ""}`}>
                  {capitalize(formatDay(d, { weekday: "long", day: "numeric" }))}
                  {["Hoy", "Mañana"].includes(rel) && <span className="ml-2 font-sans text-xs font-bold text-muted uppercase">{rel}</span>}
                </h2>
                <Link href={`/f/${id}/nuevo?fecha=${d}`} className="btn-ghost size-9 min-h-9 px-0" aria-label={`Agregar el ${d}`}>
                  <Plus className="size-4" />
                </Link>
              </div>
              {items.length ? (
                <div className={`card divide-y divide-line p-1 ${isToday ? "ring-2 ring-accent/30" : ""}`}>
                  {items.map((o) => (
                    <OccurrenceRow key={o.key} familyId={id} o={o} byId={byId} />
                  ))}
                </div>
              ) : (
                <p className="rounded-3xl border-2 border-dashed border-line px-5 py-4 text-sm text-muted">Libre</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
