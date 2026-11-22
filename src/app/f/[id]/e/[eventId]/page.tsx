import Link from "next/link";
import { notFound } from "next/navigation";
import { getFamily } from "@/lib/family";
import { loadOccurrence } from "@/lib/agenda";
import { siteUrl } from "@/lib/site";
import { CATEGORIES, VISIBILITY_LABEL, whatsappShare } from "@/lib/format";
import { RECURRENCE_LABEL, formatWhen } from "@/lib/time";
import { Badge, Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MemberAvatar, MemberChip } from "@/components/member-avatar";
import { cancelRelief, deleteEvent, requestRelief, skipOccurrence, takeOccurrence, takeRelief, toggleDone } from "../../actions";

export default async function Detalle({ params, searchParams }: PageProps<"/f/[id]/e/[eventId]">) {
  const { id, eventId } = await params;
  const sp = await searchParams;
  const { supabase, me, byId, family } = await getFamily(id);
  const o = await loadOccurrence(supabase, id, eventId, typeof sp.o === "string" ? sp.o : null);
  if (!o || o.event.masked) notFound();

  const ev = o.event;
  const startIso = o.start.toISOString();
  const self = `/f/${id}/e/${eventId}?o=${encodeURIComponent(startIso)}`;
  const cat = CATEGORIES[ev.category] ?? CATEGORIES.otro;
  const responsible = o.responsibleId ? byId[o.responsibleId] : null;
  const participants = ev.participant_ids.map((p) => byId[p]).filter(Boolean);
  const recurring = ev.recurrence !== "none";
  const isFamily = ev.visibility === "familia";
  const relief = o.relief;
  const when = formatWhen(o.start, ev.all_day, o.end);
  const shareText = relief?.status === "abierto"
    ? `🙋 ¿Alguien puede encargarse de “${ev.title}”? ${when}.${relief.reason ? ` (${relief.reason})` : ""} Respóndelo en Uniluva: ${await siteUrl()}${self}`
    : "";

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/f/${id}`} className="link text-sm">
        ← Hoy
      </Link>
      <div className="mt-3">
        <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
      </div>

      <article className="card">
        <div className="flex items-start gap-3">
          <span className="text-3xl" aria-hidden>
            {cat.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className={`text-2xl font-bold tracking-tight ${o.done ? "line-through opacity-60" : ""}`}>{ev.title}</h1>
            <p className="mt-1 font-medium">{when}</p>
            {recurring && <p className="text-sm text-muted">🔁 {RECURRENCE_LABEL[ev.recurrence]}{ev.recur_until ? ` hasta el ${ev.recur_until.split("-").reverse().join("-")}` : ""}</p>}
            {ev.location && <p className="mt-1 text-sm text-muted">📍 {ev.location}</p>}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {isFamily ? <MemberChip member={responsible} prefix={responsible ? "Se encarga " : undefined} /> : <Badge>{VISIBILITY_LABEL[ev.visibility].label}</Badge>}
          {participants.length > 0 && (
            <span className="flex items-center gap-1 text-sm text-muted">
              Para{" "}
              {participants.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1">
                  <MemberAvatar member={p} size={20} /> {p.name}
                </span>
              ))}
            </span>
          )}
          {o.done && <Badge tone="ok">✓ Hecho{o.doneBy && byId[o.doneBy] ? ` por ${byId[o.doneBy].name}` : ""}</Badge>}
        </div>

        {ev.notes && <p className="mt-4 whitespace-pre-line rounded-xl bg-surface-2 p-3 text-sm">{ev.notes}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <form action={toggleDone.bind(null, id, eventId, startIso, o.done, self)}>
            <SubmitButton className={o.done ? "btn-secondary" : "btn-primary"} pendingText="…">
              {o.done ? "Marcar como pendiente" : "✓ Marcar como hecho"}
            </SubmitButton>
          </form>
          {isFamily && !responsible && !relief && (
            <form action={takeOccurrence.bind(null, id, eventId, startIso, recurring, self)}>
              <SubmitButton className="btn-secondary" pendingText="…">
                🙋 Me encargo yo
              </SubmitButton>
            </form>
          )}
        </div>
      </article>

      {isFamily && (
        <section className="card mt-4">
          <h2 className="font-semibold">🙋 Relevo</h2>
          {relief?.status === "abierto" ? (
            <div className="mt-3">
              <p className="text-sm">
                <strong>{relief.requested_by ? (byId[relief.requested_by]?.name ?? "Alguien") : "Alguien"}</strong> pidió relevo
                {relief.reason ? `: “${relief.reason}”` : "."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {relief.requested_by !== me.id && (
                  <form action={takeRelief.bind(null, id, relief.id, self)}>
                    <SubmitButton pendingText="…">Yo me encargo</SubmitButton>
                  </form>
                )}
                <a href={whatsappShare(shareText)} target="_blank" rel="noopener noreferrer" className="btn-wa">
                  Avisar por WhatsApp
                </a>
                {(relief.requested_by === me.id || me.role === "admin") && (
                  <form action={cancelRelief.bind(null, id, relief.id, self)}>
                    <SubmitButton className="btn-secondary" pendingText="…">
                      Ya no lo necesito
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
          ) : relief?.status === "tomado" ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {relief.taken_by && byId[relief.taken_by] ? <strong>{byId[relief.taken_by].name}</strong> : "Alguien"}{" "}
                {relief.requested_by ? `tomó el relevo de ${byId[relief.requested_by]?.name ?? "otra persona"}` : "se ofreció para este día"} 💜
              </span>
              {relief.taken_by === me.id && (
                <form action={cancelRelief.bind(null, id, relief.id, self)}>
                  <SubmitButton className="link text-xs" pendingText="…">
                    Ya no puedo
                  </SubmitButton>
                </form>
              )}
            </div>
          ) : (
            <form action={requestRelief.bind(null, id, eventId, startIso)} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input className="input flex-1" name="reason" maxLength={300} placeholder="¿Por qué? (opcional) Ej: tengo reunión" />
              <SubmitButton className="btn-secondary" pendingText="…">
                Pedir relevo
              </SubmitButton>
            </form>
          )}
          {!relief && <p className="hint mt-2">Si no puedes, pide relevo: tu familia verá que alguien necesita tomarlo.</p>}
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/f/${id}/e/${eventId}/editar`} className="btn-secondary">
          Editar{recurring ? " (todas)" : ""}
        </Link>
        {recurring && (
          <form action={skipOccurrence.bind(null, id, eventId, startIso)}>
            <SubmitButton className="btn-secondary" confirm="¿Quitar solo este día de la serie?" pendingText="…">
              Quitar solo este día
            </SubmitButton>
          </form>
        )}
        <form action={deleteEvent.bind(null, id, eventId)}>
          <SubmitButton className="btn-danger" confirm={recurring ? "¿Eliminar todas las repeticiones?" : "¿Eliminar?"} pendingText="…">
            Eliminar{recurring ? " todas" : ""}
          </SubmitButton>
        </form>
      </div>
      <p className="mt-6 text-xs text-muted">{family.name}</p>
    </div>
  );
}
