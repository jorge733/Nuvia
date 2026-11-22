import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, HandHeart, Sparkles, UserPlus } from "lucide-react";
import { getFamily } from "@/lib/family";
import { groupByDay, loadAgenda, type Occurrence } from "@/lib/agenda";
import { addDays, capitalize, formatDay, nowMs, relativeDay, shortDay, startOfDay, todayKey } from "@/lib/time";
import { Empty, Flash, SectionHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { DoneButton } from "@/components/done-button";
import { OccurrenceRow } from "@/components/occurrence-row";
import { QuickAdd } from "@/components/quick-add";
import { takeOccurrence, takeRelief, toggleDone } from "./actions";

function greeting(hour: number) {
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default async function Hoy({ params, searchParams }: PageProps<"/f/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, me, byId, members, family } = await getFamily(id);
  if (family.is_personal) redirect("/mi");

  const today = todayKey();
  const list = await loadAgenda(supabase, id, startOfDay(today), startOfDay(addDays(today, 14)));
  const days = groupByDay(list);
  const self = `/f/${id}`;
  const now = nowMs();
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", hour: "numeric", hourCycle: "h23" }).format(now));

  const needRelief = list.filter((o) => o.relief?.status === "abierto" && (o.end ?? o.start).getTime() >= now);
  const unassigned = list.filter(
    (o) => o.event.visibility === "familia" && !o.responsibleId && !o.relief && !o.done && o.day < addDays(today, 7) && (o.end ?? o.start).getTime() >= now,
  );
  const todayList = days.get(today) ?? [];
  const tomorrow = addDays(today, 1);
  const tomorrowList = days.get(tomorrow) ?? [];
  const nextDays = Array.from({ length: 5 }, (_, i) => addDays(today, i + 2)).filter((d) => days.get(d)?.length);
  const mineToday = todayList.filter((o) => o.responsibleId === me.id);
  const doneToday = todayList.filter((o) => o.done).length;

  const doneButton = (o: Occurrence) =>
    o.event.masked ? null : (
      <form action={toggleDone.bind(null, id, o.event.id, o.start.toISOString(), o.done, self)}>
        <DoneButton done={o.done} />
      </form>
    );

  return (
    <div className="space-y-8">
      <div>
        <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} link={sp.abrir} />

        <header className="rise hero-glow relative overflow-hidden rounded-[2rem] p-6 text-white shadow-soft sm:p-8" style={{ background: "var(--hero)" }}>
          <div className="float-slow pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/10" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 right-24 size-40 rounded-full bg-white/10" aria-hidden />
          <p className="text-sm font-semibold text-white/80">{capitalize(formatDay(today))}</p>
          <h1 className="mt-1 text-4xl font-semibold sm:text-5xl">
            {greeting(hour)}, {me.name}
          </h1>
          <p className="mt-3 max-w-md text-white/85">
            {todayList.length === 0
              ? "Hoy no hay nada agendado. Un buen día para respirar."
              : mineToday.length > 0
                ? `Hoy te encargas de ${mineToday.length} ${mineToday.length === 1 ? "cosa" : "cosas"}. Lo demás está repartido.`
                : "Hoy no tienes nada a tu cargo. Tu familia lo tiene cubierto."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
            <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
              {todayList.length} hoy{todayList.length ? ` · ${doneToday} hechas` : ""}
            </span>
            {needRelief.length > 0 && <span className="rounded-full bg-white px-3 py-1.5 text-sun">{needRelief.length} {needRelief.length === 1 ? "necesita" : "necesitan"} relevo</span>}
            {unassigned.length > 0 && <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">{unassigned.length} sin responsable</span>}
          </div>
        </header>
      </div>

      <QuickAdd from={self} defaultSpace={id} spaces={[{ id, name: family.name }]} />

      {sp.bienvenida === "1" && (
        <section className="card rise">
          <p className="eyebrow flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> Primeros pasos
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link href={`/mi/nuevo?para=${id}`} className="rounded-2xl bg-surface-2 p-4 transition hover:bg-line">
              <CalendarPlus className="size-5 text-accent" />
              <p className="mt-2 text-sm font-semibold">Agrega lo primero de la semana</p>
            </Link>
            <Link href={`/f/${id}/familia`} className="rounded-2xl bg-surface-2 p-4 transition hover:bg-line">
              <UserPlus className="size-5 text-accent" />
              <p className="mt-2 text-sm font-semibold">Invita a los demás adultos</p>
            </Link>
            <Link href="/perfil" className="rounded-2xl bg-surface-2 p-4 transition hover:bg-line">
              <HandHeart className="size-5 text-accent" />
              <p className="mt-2 text-sm font-semibold">Conecta tu calendario</p>
            </Link>
          </div>
        </section>
      )}

      {needRelief.length > 0 && (
        <section>
          <SectionHeader title="Necesitan relevo" count={needRelief.length} />
          <div className="stagger card divide-y divide-line p-1 ring-2 ring-sun/40">
            {needRelief.map((o) => (
              <OccurrenceRow
                key={o.key}
                familyId={id}
                o={o}
                byId={byId}
                showDay={shortDay(o.day, today)}
                action={
                  o.relief!.requested_by !== me.id ? (
                    <form action={takeRelief.bind(null, id, o.relief!.id, self)}>
                      <SubmitButton className="btn-sun min-h-9 px-4 py-1.5 text-xs" pendingText="…">
                        Yo voy
                      </SubmitButton>
                    </form>
                  ) : (
                    <span className="text-xs text-muted">Lo pediste tú</span>
                  )
                }
              />
            ))}
          </div>
        </section>
      )}

      {unassigned.length > 0 && (
        <section>
          <SectionHeader title="Sin responsable" count={unassigned.length} />
          <div className="stagger card divide-y divide-line p-1">
            {unassigned.map((o) => (
              <OccurrenceRow
                key={o.key}
                familyId={id}
                o={o}
                byId={byId}
                showDay={shortDay(o.day, today)}
                action={
                  <form action={takeOccurrence.bind(null, id, o.event.id, o.start.toISOString(), o.event.recurrence !== "none", self)}>
                    <SubmitButton className="btn-secondary min-h-9 px-4 py-1.5 text-xs" pendingText="…">
                      Me encargo
                    </SubmitButton>
                  </form>
                }
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="Hoy" href={`/mi/nuevo?para=${id}`} linkText="＋ Agregar" />
        {todayList.length ? (
          <div className="stagger card divide-y divide-line p-1">
            {todayList.map((o) => (
              <OccurrenceRow key={o.key} familyId={id} o={o} byId={byId} action={doneButton(o)} />
            ))}
          </div>
        ) : (
          <Empty icon={<Sun />}>Nada para hoy.</Empty>
        )}
      </section>

      <section>
        <SectionHeader title="Mañana" href={`/mi/nuevo?para=${id}&fecha=${tomorrow}`} linkText="＋ Agregar" />
        {tomorrowList.length ? (
          <div className="stagger card divide-y divide-line p-1">
            {tomorrowList.map((o) => (
              <OccurrenceRow key={o.key} familyId={id} o={o} byId={byId} />
            ))}
          </div>
        ) : (
          <Empty>Nada para mañana.</Empty>
        )}
      </section>

      {nextDays.length > 0 && (
        <section>
          <SectionHeader title="Próximos días" href={`/f/${id}/semana`} linkText="Ver semana" />
          <div className="stagger space-y-4">
            {nextDays.map((d) => (
              <div key={d} className="card p-1">
                <p className="px-4 pt-3 pb-1 text-sm font-bold text-muted">{relativeDay(d, today)}</p>
                <div className="divide-y divide-line">
                  {days.get(d)!.map((o) => (
                    <OccurrenceRow key={o.key} familyId={id} o={o} byId={byId} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {members.length === 1 && (
        <Link href={`/f/${id}/familia`} className="card flex items-center gap-4 transition hover:ring-2 hover:ring-accent/30">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <UserPlus className="size-5" />
          </span>
          <span>
            <span className="block font-semibold">Agrega a tu familia</span>
            <span className="text-sm text-muted">Uniluva brilla cuando todos se reparten las cosas.</span>
          </span>
        </Link>
      )}
    </div>
  );
}

function Sun() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="20" r="8" fill="var(--sun)" fillOpacity=".5" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="19" y="3" width="2" height="6" rx="1" fill="var(--sun)" fillOpacity=".4" transform={`rotate(${i * 45} 20 20)`} />
      ))}
    </svg>
  );
}
