import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getMySpaces } from "@/lib/family";
import { groupByDay } from "@/lib/agenda";
import { loadMine, type MyOccurrence } from "@/lib/mine";
import { addDays, capitalize, formatDay, isDayKey, keyParts, relativeDay, startOfDay, startOfWeek, todayKey } from "@/lib/time";
import { OccurrenceRow } from "@/components/occurrence-row";
import { Flash } from "@/components/ui";

export const metadata = { title: "Mi semana" };

const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

export default async function MiSemana({ searchParams }: PageProps<"/mi/semana">) {
  const sp = await searchParams;
  const { supabase, user, spaces } = await getMySpaces();
  const today = todayKey();
  const monday = startOfWeek(isDayKey(sp.d) ? sp.d : today);
  const { items, byId } = await loadMine(supabase, user.id, spaces, startOfDay(monday), startOfDay(addDays(monday, 7)));
  const days = groupByDay(items) as Map<string, MyOccurrence[]>;
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const hasFamilies = spaces.some((s) => !s.isPersonal);

  return (
    <div>
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} link={sp.abrir} />
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{capitalize(formatDay(monday, { month: "long", year: "numeric" }))}</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Mi semana</h1>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/mi/semana?d=${addDays(monday, -7)}`} className="btn-ghost size-11 px-0" aria-label="Semana anterior">
            <ChevronLeft className="size-5" />
          </Link>
          <Link href="/mi/semana" className="btn-secondary min-h-10 px-4 py-1.5">
            Hoy
          </Link>
          <Link href={`/mi/semana?d=${addDays(monday, 7)}`} className="btn-ghost size-11 px-0" aria-label="Semana siguiente">
            <ChevronRight className="size-5" />
          </Link>
        </div>
      </div>

      <div className="card mb-6 grid grid-cols-7 gap-1 p-2">
        {week.map((d, i) => {
          const n = days.get(d)?.length ?? 0;
          const isToday = d === today;
          return (
            <a key={d} href={`#d-${d}`} className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 transition ${isToday ? "bg-accent text-accent-fg" : "hover:bg-surface-2"}`}>
              <span className={`text-[11px] font-bold ${isToday ? "opacity-80" : "text-muted"}`}>{LETTERS[i]}</span>
              <span className="font-display text-lg leading-none font-semibold">{keyParts(d).d}</span>
              <span className="flex h-1.5 gap-0.5">
                {Array.from({ length: Math.min(n, 4) }, (_, k) => (
                  <span key={k} className={`size-1.5 rounded-full ${isToday ? "bg-current" : "bg-accent"}`} />
                ))}
              </span>
            </a>
          );
        })}
      </div>

      <div className="space-y-6">
        {week.map((d) => {
          const list = days.get(d) ?? [];
          const rel = relativeDay(d, today);
          return (
            <section key={d} id={`d-${d}`} className={`scroll-mt-36 ${d < today ? "opacity-60" : ""}`}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className={`text-lg font-semibold ${d === today ? "text-accent" : ""}`}>
                  {capitalize(formatDay(d, { weekday: "long", day: "numeric" }))}
                  {["Hoy", "Mañana"].includes(rel) && <span className="ml-2 font-sans text-xs font-bold text-muted uppercase">{rel}</span>}
                </h2>
                <Link href={`/mi/nuevo?fecha=${d}`} className="btn-ghost size-9 min-h-9 px-0" aria-label={`Agregar el ${d}`}>
                  <Plus className="size-4" />
                </Link>
              </div>
              {list.length ? (
                <div className={`stagger card divide-y divide-line p-1 ${d === today ? "ring-2 ring-accent/30" : ""}`}>
                  {list.map((o) => (
                    <OccurrenceRow
                      key={o.key}
                      familyId={o.space.id}
                      o={o}
                      byId={byId}
                      tag={hasFamilies ? { label: o.space.isPersonal ? "Personal" : o.space.name, personal: o.space.isPersonal } : undefined}
                    />
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
