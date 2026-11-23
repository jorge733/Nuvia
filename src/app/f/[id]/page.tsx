import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, Check, HandHeart, Sparkles, UserPlus } from "lucide-react";
import { getFamily } from "@/lib/family";
import { groupByDay, loadAgenda, type Occurrence } from "@/lib/agenda";
import { addDays, capitalize, formatDay, nowMs, relativeDay, shortDay, startOfDay, todayKey } from "@/lib/time";
import { Empty, Flash, SectionHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { DoneButton } from "@/components/done-button";
import { OccurrenceRow } from "@/components/occurrence-row";
import { QuickAdd } from "@/components/quick-add";
import { takeOccurrence, takeRelief, toggleDoneInPlace } from "./actions";

// Resumen de la familia: la foto del día de todos. Lo tuyo (de todos lados) está en Hoy (/mi).
export default async function Resumen({ params, searchParams }: PageProps<"/f/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, me, byId, members, family } = await getFamily(id);
  if (family.is_personal) redirect("/mi");

  const today = todayKey();
  const list = await loadAgenda(supabase, id, startOfDay(today), startOfDay(addDays(today, 14)));
  const days = groupByDay(list);
  const self = `/f/${id}`;
  const now = nowMs();

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
      <DoneButton done={o.done} action={toggleDoneInPlace.bind(null, id, o.event.id, o.start.toISOString(), o.done)} />
    );

  return (
    <div>
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} link={sp.abrir} />
      {/* En PC: la agenda a la izquierda; lo que espera a alguien, a la derecha. */}
      <div className="split">
        <div className="split-main">
          <header className="order-1 rise card">
            <p className="text-sm font-semibold text-muted">{capitalize(formatDay(today))}</p>
            <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Hoy en {family.name}</h1>
            <p className="mt-2 max-w-md text-muted">
              {todayList.length === 0
                ? "Hoy no hay nada agendado. Un buen día para respirar."
                : mineToday.length > 0
                  ? `Te encargas de ${mineToday.length} de ${todayList.length}. Lo demás está repartido.`
                  : "Hoy no tienes nada a tu cargo. Tu familia lo tiene cubierto."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
              <span className="rounded-full bg-surface-2 px-3 py-1.5">
                {todayList.length} hoy{todayList.length ? ` · ${doneToday} hechas` : ""}
              </span>
              {needRelief.length > 0 && (
                <span className="rounded-full bg-sun-soft px-3 py-1.5 text-sun">
                  {needRelief.length} {needRelief.length === 1 ? "necesita" : "necesitan"} relevo
                </span>
              )}
              {unassigned.length > 0 && <span className="rounded-full bg-surface-2 px-3 py-1.5">{unassigned.length} sin responsable</span>}
            </div>
          </header>

          <div className="order-2">
            <QuickAdd from={self} defaultSpace={id} spaces={[{ id, name: family.name }]} />
          </div>

          {sp.bienvenida === "1" && (
            <section className="order-3 card rise">
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

          <section className="order-6">
            <SectionHeader title="Hoy, toda la familia" href={`/mi/nuevo?para=${id}`} linkText="＋ Agregar" />
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

          <section className="order-7">
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
            <section className="order-8">
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
        </div>

        <aside className="split-side">
          {needRelief.length > 0 && (
            <section className="order-4">
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
            <section className="order-5">
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

          {!needRelief.length && !unassigned.length && (
            <section className="order-4 hidden lg:block">
              <SectionHeader title="Todo repartido" />
              <div className="card flex items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ok-soft text-ok">
                  <Check className="size-6" strokeWidth={2.6} />
                </span>
                <p className="text-sm text-muted">No hay relevos pendientes ni actividades sin responsable esta semana.</p>
              </div>
            </section>
          )}

          {members.length === 1 && (
            <Link href={`/f/${id}/familia`} className="order-9 card flex items-center gap-4 transition hover:ring-2 hover:ring-accent/30">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <UserPlus className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">Agrega a tu familia</span>
                <span className="text-sm text-muted">Uniluva brilla cuando todos se reparten las cosas.</span>
              </span>
            </Link>
          )}
        </aside>
      </div>
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
