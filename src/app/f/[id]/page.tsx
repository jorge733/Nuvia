import Link from "next/link";
import { getFamily } from "@/lib/family";
import { groupByDay, loadAgenda, type Occurrence } from "@/lib/agenda";
import { addDays, capitalize, formatDay, nowMs, relativeDay, startOfDay, todayKey } from "@/lib/time";
import { Empty, Flash, SectionHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { OccurrenceRow } from "@/components/occurrence-row";
import { takeOccurrence, takeRelief, toggleDone } from "./actions";

export default async function Hoy({ params, searchParams }: PageProps<"/f/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, me, byId, members } = await getFamily(id);

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
  const mineToday = todayList.filter((o) => o.responsibleId === me.id && !o.done).length;

  const doneButton = (o: Occurrence) =>
    o.event.masked ? null : (
      <form action={toggleDone.bind(null, id, o.event.id, o.start.toISOString(), o.done, self)}>
        <SubmitButton
          className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm ${o.done ? "border-ok bg-ok-soft text-ok" : "border-line text-muted hover:border-ok hover:text-ok"}`}
          pendingText="…"
        >
          ✓<span className="sr-only">{o.done ? "Marcar pendiente" : "Marcar hecho"}</span>
        </SubmitButton>
      </form>
    );

  return (
    <div>
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />

      <header className="mb-6">
        <p className="text-sm text-muted">{capitalize(formatDay(today))}</p>
        <h1 className="text-3xl font-bold tracking-tight">Hola, {me.name}</h1>
        <p className="mt-1 text-muted">
          {todayList.length === 0
            ? "Hoy no hay nada agendado. Un buen día para respirar."
            : mineToday > 0
              ? `Hoy te encargas de ${mineToday} ${mineToday === 1 ? "cosa" : "cosas"}.`
              : "Hoy no tienes nada a tu cargo."}
        </p>
      </header>

      {sp.bienvenida === "1" && (
        <section className="card mb-6 bg-accent-soft">
          <h2 className="font-semibold">Primeros pasos</h2>
          <ol className="mt-2 space-y-2 text-sm">
            <li>
              1. <Link href={`/f/${id}/nuevo`} className="link">Agrega lo primero que tu familia tiene que hacer esta semana</Link> y elige quién se encarga.
            </li>
            <li>
              2. <Link href={`/f/${id}/familia`} className="link">Invita a los demás adultos</Link> con un enlace por WhatsApp.
            </li>
            <li>
              3. <Link href="/perfil" className="link">Conecta Uniluva a tu calendario</Link> para recibir los avisos en el celular.
            </li>
          </ol>
        </section>
      )}

      {needRelief.length > 0 && (
        <section className="mb-6">
          <SectionHeader title="🙋 Necesitan relevo" />
          <div className="card divide-y divide-line border-warn/40 p-0 sm:p-0">
            {needRelief.map((o) => (
              <OccurrenceRow
                key={o.key}
                familyId={id}
                o={o}
                byId={byId}
                showDay={relativeDay(o.day, today)}
                action={
                  o.relief!.requested_by !== me.id ? (
                    <form action={takeRelief.bind(null, id, o.relief!.id, self)}>
                      <SubmitButton className="btn-primary px-3 py-2 text-xs" pendingText="…">
                        Yo me encargo
                      </SubmitButton>
                    </form>
                  ) : (
                    <span className="pt-1 text-xs text-muted">Lo pediste tú</span>
                  )
                }
              />
            ))}
          </div>
        </section>
      )}

      {unassigned.length > 0 && (
        <section className="mb-6">
          <SectionHeader title="Sin responsable" />
          <div className="card divide-y divide-line p-0 sm:p-0">
            {unassigned.map((o) => (
              <OccurrenceRow
                key={o.key}
                familyId={id}
                o={o}
                byId={byId}
                showDay={relativeDay(o.day, today)}
                action={
                  <form action={takeOccurrence.bind(null, id, o.event.id, o.start.toISOString(), o.event.recurrence !== "none", self)}>
                    <SubmitButton className="btn-secondary px-3 py-2 text-xs" pendingText="…">
                      Me encargo
                    </SubmitButton>
                  </form>
                }
              />
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <SectionHeader title="Hoy" />
        {todayList.length ? (
          <div className="card divide-y divide-line p-0 sm:p-0">
            {todayList.map((o) => (
              <OccurrenceRow key={o.key} familyId={id} o={o} byId={byId} action={doneButton(o)} />
            ))}
          </div>
        ) : (
          <Empty>
            Nada para hoy.{" "}
            <Link href={`/f/${id}/nuevo`} className="link">
              Agregar algo
            </Link>
          </Empty>
        )}
      </section>

      <section className="mb-6">
        <SectionHeader title="Mañana" href={`/f/${id}/nuevo?fecha=${tomorrow}`} linkText="＋ Agregar" />
        {tomorrowList.length ? (
          <div className="card divide-y divide-line p-0 sm:p-0">
            {tomorrowList.map((o) => (
              <OccurrenceRow key={o.key} familyId={id} o={o} byId={byId} />
            ))}
          </div>
        ) : (
          <Empty>Nada para mañana.</Empty>
        )}
      </section>

      {nextDays.length > 0 && (
        <section className="mb-6">
          <SectionHeader title="Próximos días" href={`/f/${id}/semana`} linkText="Ver semana" />
          <div className="space-y-3">
            {nextDays.map((d) => (
              <div key={d} className="card p-0 sm:p-0">
                <p className="border-b border-line px-4 py-2 text-sm font-semibold">{relativeDay(d, today)}</p>
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
        <Link href={`/f/${id}/familia`} className="card flex items-center justify-between bg-accent-soft hover:border-accent">
          <span>
            <span className="block font-semibold">Agrega a tu familia</span>
            <span className="text-sm text-muted">Uniluva brilla cuando todos se reparten las cosas.</span>
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}
