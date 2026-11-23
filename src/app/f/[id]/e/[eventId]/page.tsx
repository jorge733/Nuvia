import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, HandHeart, Link2, MapPin, Mail, Pencil, Repeat, Trash2, Lock, EyeOff } from "lucide-react";
import { getFamily } from "@/lib/family";
import { loadOccurrence } from "@/lib/agenda";
import { siteUrl } from "@/lib/site";
import { CATEGORIES, whatsappShare } from "@/lib/format";
import { RECURRENCE_LABEL, formatWhen } from "@/lib/time";
import { Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MemberAvatar, memberHex } from "@/components/member-avatar";
import { cancelRelief, createShareLink, deleteEvent, disableShareLink, requestRelief, skipOccurrence, takeOccurrence, takeRelief, toggleDone } from "../../actions";

export default async function Detalle({ params, searchParams }: PageProps<"/f/[id]/e/[eventId]">) {
  const { id, eventId } = await params;
  const sp = await searchParams;
  const { supabase, me, byId } = await getFamily(id);
  const [o, { data: guests }, { data: share }, site] = await Promise.all([
    loadOccurrence(supabase, id, eventId, typeof sp.o === "string" ? sp.o : null),
    supabase.from("event_guests").select("email, muted").eq("event_id", eventId).order("created_at"),
    supabase.from("events").select("share_token").eq("id", eventId).maybeSingle(),
    siteUrl(),
  ]);
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
  const tint = relief?.status === "abierto" ? "var(--sun)" : (memberHex(responsible) ?? "var(--accent)");
  const shareText =
    relief?.status === "abierto"
      ? `🙋 ¿Alguien puede encargarse de “${ev.title}”? ${when}.${relief.reason ? ` (${relief.reason})` : ""} Respóndelo en Uniluva: ${site}${self}`
      : "";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={`/f/${id}`} className="btn-ghost -ml-3 min-h-9 py-1.5">
        <ArrowLeft className="size-4" /> Volver
      </Link>
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />

      <article className="card relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: tint }} aria-hidden />
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: `color-mix(in srgb, ${tint} 14%, transparent)` }} aria-hidden>
            {cat.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{cat.label}</p>
            <h1 className={`mt-0.5 text-3xl font-semibold ${o.done ? "text-muted line-through decoration-2" : ""}`}>{ev.title}</h1>
          </div>
        </div>

        <dl className="mt-5 space-y-2.5 text-sm">
          <div className="flex items-center gap-2 font-semibold">{when}</div>
          {recurring && (
            <div className="flex items-center gap-2 text-muted">
              <Repeat className="size-4" />
              {RECURRENCE_LABEL[ev.recurrence]}
              {ev.recur_until ? ` hasta el ${ev.recur_until.split("-").reverse().join("-")}` : ""}
            </div>
          )}
          {ev.location && (
            <div className="flex items-center gap-2 text-muted">
              <MapPin className="size-4" /> {ev.location}
            </div>
          )}
          {ev.visibility === "privado" && (
            <div className="flex items-center gap-2 text-muted">
              <Lock className="size-4" /> Solo tú lo ves
            </div>
          )}
          {ev.visibility === "ocupado" && (
            <div className="flex items-center gap-2 text-muted">
              <EyeOff className="size-4" /> Tu familia lo ve como “Ocupado”
            </div>
          )}
        </dl>

        {isFamily && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
              <MemberAvatar member={responsible} size={40} />
              <div>
                <p className="text-xs font-semibold text-muted">Se encarga</p>
                <p className="font-semibold">{responsible ? (responsible.id === me.id ? `${responsible.name} (tú)` : responsible.name) : "Nadie todavía"}</p>
              </div>
            </div>
            {participants.length > 0 && (
              <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                <span className="flex -space-x-2">
                  {participants.slice(0, 3).map((p) => (
                    <MemberAvatar key={p.id} member={p} size={40} ring />
                  ))}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted">Es para</p>
                  <p className="truncate font-semibold">{participants.map((p) => p.name).join(", ")}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {!!guests?.length && (
          <div className="mt-4 flex items-start gap-2 text-sm">
            <Mail className="mt-0.5 size-4 shrink-0 text-muted" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted">Invitados por correo</p>
              <ul className="mt-1 space-y-0.5">
                {guests.map((g) => (
                  <li key={g.email} className="break-all">
                    {g.email}
                    {g.muted && <span className="text-xs text-muted"> · no quiere avisos</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {ev.notes && <p className="mt-4 whitespace-pre-line rounded-2xl bg-surface-2 p-4 text-sm">{ev.notes}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <form action={toggleDone.bind(null, id, eventId, startIso, o.done, self)}>
            <SubmitButton className={o.done ? "btn-secondary" : "btn-primary"} pendingText="…">
              <Check className="size-4" strokeWidth={3} />
              {o.done ? `Hecho${o.doneBy && byId[o.doneBy] ? ` por ${byId[o.doneBy].name}` : ""} · deshacer` : "Marcar como hecho"}
            </SubmitButton>
          </form>
          {isFamily && !responsible && !relief && (
            <form action={takeOccurrence.bind(null, id, eventId, startIso, recurring, self)}>
              <SubmitButton className="btn-sun" pendingText="…">
                Me encargo yo
              </SubmitButton>
            </form>
          )}
        </div>
      </article>

      {isFamily && (
        <section className={`card ${relief?.status === "abierto" ? "ring-2 ring-sun/50" : ""}`}>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <HandHeart className="size-5 text-sun" /> Relevo
          </h2>
          {relief?.status === "abierto" ? (
            <div className="mt-3">
              <p className="text-sm">
                <strong>{relief.requested_by ? (byId[relief.requested_by]?.name ?? "Alguien") : "Alguien"}</strong> pidió relevo
                {relief.reason ? `: “${relief.reason}”` : "."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {relief.requested_by !== me.id && (
                  <form action={takeRelief.bind(null, id, relief.id, self)}>
                    <SubmitButton className="btn-sun" pendingText="…">
                      Yo me encargo
                    </SubmitButton>
                  </form>
                )}
                <a href={whatsappShare(shareText)} target="_blank" rel="noopener noreferrer" className="btn-wa">
                  Avisar por WhatsApp
                </a>
                {(relief.requested_by === me.id || me.role === "admin") && (
                  <form action={cancelRelief.bind(null, id, relief.id, self)}>
                    <SubmitButton className="btn-ghost" pendingText="…">
                      Ya no lo necesito
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
          ) : relief?.status === "tomado" ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <MemberAvatar member={relief.taken_by ? byId[relief.taken_by] : null} size={28} />
                <span>
                  <strong>{(relief.taken_by && byId[relief.taken_by]?.name) || "Alguien"}</strong>{" "}
                  {relief.requested_by ? `tomó el relevo de ${byId[relief.requested_by]?.name ?? "otra persona"}` : "se ofreció para este día"}. ¡Gracias!
                </span>
              </span>
              {relief.taken_by === me.id && (
                <form action={cancelRelief.bind(null, id, relief.id, self)}>
                  <SubmitButton className="btn-ghost min-h-9 py-1.5 text-xs" pendingText="…">
                    Ya no puedo
                  </SubmitButton>
                </form>
              )}
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">¿No puedes? Pide relevo y tu familia verá que alguien necesita tomarlo.</p>
              <form action={requestRelief.bind(null, id, eventId, startIso)} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input className="input flex-1" name="reason" maxLength={300} placeholder="¿Por qué? (opcional) Ej: tengo reunión" />
                <SubmitButton className="btn-secondary" pendingText="…">
                  Pedir relevo
                </SubmitButton>
              </form>
            </>
          )}
        </section>
      )}

      <section className="card">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Link2 className="size-5 text-accent" /> Invitar con un enlace
        </h2>
        {share?.share_token ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted">Quien tenga el enlace ve la fecha, hora, lugar y notas, y puede dejar su correo para recibir los avisos. No necesita cuenta.</p>
            <input className="input text-xs" readOnly value={`${site}/invitacion/${share.share_token}`} aria-label="Enlace de invitación" />
            <div className="flex flex-wrap gap-2">
              <a
                href={whatsappShare(`Te invito a “${ev.title}” · ${when}${ev.location ? ` · ${ev.location}` : ""}. Los detalles aquí: ${site}/invitacion/${share.share_token}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-wa"
              >
                Invitar por WhatsApp
              </a>
              <form action={disableShareLink.bind(null, id, eventId, self)}>
                <SubmitButton className="btn-ghost" confirm="El enlace dejará de funcionar. Quienes ya dejaron su correo siguen invitados. ¿Continuar?" pendingText="…">
                  Desactivar enlace
                </SubmitButton>
              </form>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">Crea un enlace para compartir por WhatsApp. Quien lo abra verá la actividad sin necesitar cuenta.</p>
            <form action={createShareLink.bind(null, id, eventId, self)} className="mt-4">
              <SubmitButton className="btn-secondary" pendingText="…">
                Crear enlace de invitación
              </SubmitButton>
            </form>
          </>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href={`/f/${id}/e/${eventId}/editar`} className="btn-secondary">
          <Pencil className="size-4" /> Editar{recurring ? " (todas)" : ""}
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
            <Trash2 className="size-4" /> Eliminar{recurring ? " todas" : ""}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
