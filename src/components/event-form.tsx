import Link from "next/link";
import { Clock, Lock, Users } from "lucide-react";
import type { AgendaEvent } from "@/lib/agenda";
import type { Member } from "@/lib/family";
import { CATEGORIES, VISIBILITY_LABEL } from "@/lib/format";
import { RECURRENCE_LABEL, addDays, capitalize, dayKey, formatDay, timeOf, todayKey } from "@/lib/time";
import { Field } from "./ui";
import { SubmitButton } from "./submit-button";
import { MemberAvatar } from "./member-avatar";
import { DateField } from "./date-field";

function dateChips() {
  const today = todayKey();
  return [
    { key: today, label: "Hoy" },
    { key: addDays(today, 1), label: "Mañana" },
    ...Array.from({ length: 5 }, (_, i) => {
      const k = addDays(today, i + 2);
      return { key: k, label: capitalize(formatDay(k, { weekday: "short", day: "numeric" }).replace(".", "").replace(",", "")) };
    }),
  ];
}

/** Un lugar donde puede quedar la actividad (agenda personal o una familia). */
export type Destination = { id: string; name: string; isPersonal: boolean; members: Member[]; me: Member };

function ResponsibleChips({ members, me, name, event }: { members: Member[]; me: Member; name: string; event?: AgendaEvent }) {
  // Las mascotas pueden ser "para quién" (veterinario), pero no responsables.
  const canBeResponsible = members.filter((m) => m.kind !== "mascota");
  return (
    <fieldset>
      <legend className="label">¿Quién se encarga?</legend>
      <div className="flex flex-wrap gap-2">
        {canBeResponsible.map((m) => (
          <label key={m.id} className="cursor-pointer">
            <input type="radio" name={name} value={m.id} defaultChecked={event ? event.responsible_id === m.id : m.id === me.id} className="peer sr-only" />
            <span className="inline-flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 text-sm peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
              <MemberAvatar member={m} size={26} />
              {m.id === me.id ? "Yo" : m.name}
            </span>
          </label>
        ))}
        <label className="cursor-pointer">
          <input type="radio" name={name} value="" defaultChecked={event ? !event.responsible_id : false} className="peer sr-only" />
          <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-line py-1 pr-3 pl-1 text-sm text-muted peer-checked:border-sun peer-checked:bg-sun-soft peer-checked:text-sun peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
            <MemberAvatar member={null} size={26} />
            Que alguien lo tome
          </span>
        </label>
      </div>
    </fieldset>
  );
}

function ParticipantChips({ members, me, name, selected }: { members: Member[]; me: Member; name: string; selected: Set<string> }) {
  return (
    <fieldset>
      <legend className="label">¿Para quién es?</legend>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <label key={m.id} className="cursor-pointer">
            <input type="checkbox" name={name} value={m.id} defaultChecked={selected.has(m.id)} className="peer sr-only" />
            <span className="inline-flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 text-sm peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
              <MemberAvatar member={m} size={24} />
              {m.id === me.id ? "Yo" : m.name}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ChoiceCard({ name, value, checked, Icon, label, hint }: { name: string; value: string; checked: boolean; Icon: typeof Lock; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-2xl border border-line p-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="sr-only" />
      <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}

/** "¿Quién lo ve?": una sola pregunta que también decide dónde se guarda. */
function WhoSees({ destinations, defaultDest, moving }: { destinations: Destination[]; defaultDest: string; moving: boolean }) {
  const personal = destinations.find((d) => d.isPersonal);
  const families = destinations.filter((d) => !d.isPersonal);
  if (!families.length) {
    return <input type="hidden" name="dest" value={`${personal?.id}:privado`} />;
  }
  return (
    <fieldset>
      <legend className="label">¿Quién lo ve?</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {personal && <ChoiceCard name="dest" value={`${personal.id}:privado`} checked={defaultDest === `${personal.id}:privado`} Icon={Lock} label="Solo yo" hint="Nadie más lo ve" />}
        {families.map((f) => (
          <ChoiceCard key={`${f.id}:familia`} name="dest" value={`${f.id}:familia`} checked={defaultDest === `${f.id}:familia`} Icon={Users} label={f.name} hint="Todos ven los detalles y alguien se encarga" />
        ))}
        {families.map((f) => (
          <ChoiceCard
            key={`${f.id}:ocupado`}
            name="dest"
            value={`${f.id}:ocupado`}
            checked={defaultDest === `${f.id}:ocupado`}
            Icon={Clock}
            label="Que estoy ocupado/a"
            hint={`${f.name} ve el bloque, sin detalles`}
          />
        ))}
      </div>
      {moving && <p className="hint">Si la cambias de lugar, lo marcado como hecho y los relevos anteriores no se trasladan.</p>}
      {/* Muestra los campos de la familia elegida sin JavaScript. */}
      <style>
        {`[data-show]{display:none}` + families.map((f) => `form:has(input[name="dest"][value="${f.id}:familia"]:checked) [data-show="${f.id}"]{display:block}`).join("")}
      </style>
    </fieldset>
  );
}

export function EventForm({
  action,
  members = [],
  me,
  event,
  destinations,
  defaultDest = "",
  defaultDate,
  defaultTime,
  submitLabel,
  cancelHref,
  personal = false,
  guests = [],
}: {
  action: (formData: FormData) => Promise<void>;
  /** Al editar: integrantes del espacio del evento. */
  members?: Member[];
  me?: Member;
  event?: AgendaEvent;
  /** "¿Quién lo ve?": todos los lugares posibles y cuál viene marcado ("<id>:<visibilidad>"). Al editar, solo para quien la creó. */
  destinations?: Destination[];
  defaultDest?: string;
  defaultDate: string;
  /** Hora sugerida (al tocar un horario en el calendario). */
  defaultTime?: string;
  submitLabel: string;
  cancelHref: string;
  /** Agenda personal: sin responsable, participantes ni visibilidad. */
  personal?: boolean;
  /** Correos de los invitados (al editar). */
  guests?: string[];
}) {
  const start = event ? new Date(event.starts_at) : null;
  const end = event?.ends_at ? new Date(event.ends_at) : null;
  const participants = new Set(event?.participant_ids ?? []);
  const whoSees = !!destinations;
  const families = (destinations ?? []).filter((d) => !d.isPersonal);
  const editingFamily = !whoSees && !personal && !!me;
  const hasExtras = !!(event && (event.recurrence !== "none" || event.location || event.notes || event.participant_ids.length || event.visibility !== "familia" || guests.length));

  return (
    <form action={action} className="space-y-5">
      <div className="card space-y-5">
        <Field label="¿Qué hay que hacer?">
          <input className="input text-lg" name="title" required maxLength={120} defaultValue={event?.title} placeholder="Ej: Dentista de la Sofi" autoFocus={!event} />
        </Field>

        <div>
          <span className="label">¿Cuándo?</span>
          <DateField defaultValue={start ? dayKey(start) : defaultDate} chips={dateChips()} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Desde">
              <input className="input" type="time" name="start" defaultValue={start && !event?.all_day ? timeOf(start) : (defaultTime ?? "")} />
            </Field>
            <Field label="Hasta (opcional)">
              <input className="input" type="time" name="end" defaultValue={end ? timeOf(end) : ""} />
            </Field>
          </div>
          <p className="hint">Si no pones hora, queda para todo el día.</p>
        </div>

        {whoSees && <WhoSees destinations={destinations} defaultDest={defaultDest} moving={!!event} />}
        {families.map((f) => (
          <div key={f.id} data-show={f.id}>
            <ResponsibleChips members={f.members} me={f.me} name={`responsible_${f.id}`} event={event?.family_id === f.id ? event : undefined} />
          </div>
        ))}
        {editingFamily && <ResponsibleChips members={members} me={me} name="responsible" event={event} />}
      </div>

      <details className="card" open={hasExtras}>
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
          Más opciones
          <span className="text-sm font-normal text-muted">{families.length || editingFamily ? "tipo, repetir, para quién, invitados…" : "tipo, repetir, lugar, invitados…"}</span>
        </summary>
        <div className="mt-5 space-y-5">
          <fieldset>
            <legend className="label">Tipo</legend>
            <div className="flex flex-wrap gap-2">
              {[["auto", { label: "Automático", emoji: "✨" }] as const, ...Object.entries(CATEGORIES)].map(([key, c]) => (
                <label key={key} className="cursor-pointer">
                  <input type="radio" name="category" value={key} defaultChecked={(event?.category ?? "auto") === key} className="peer sr-only" />
                  <span className="chip peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                    <span aria-hidden>{c.emoji}</span>
                    {c.label}
                  </span>
                </label>
              ))}
            </div>
            {!event && <p className="hint">“Automático” elige el tipo según lo que escribas (dentista → Salud, comprar → Compras…).</p>}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Se repite">
              <select className="input" name="recurrence" defaultValue={event?.recurrence ?? "none"}>
                {Object.entries(RECURRENCE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hasta el (opcional)" hint="Vacío: se repite siempre.">
              <input className="input" type="date" name="recur_until" defaultValue={event?.recur_until ?? ""} />
            </Field>
          </div>

          {families.map((f) => (
            <div key={f.id} data-show={f.id}>
              <ParticipantChips members={f.members} me={f.me} name={`participants_${f.id}`} selected={event?.family_id === f.id ? participants : new Set()} />
            </div>
          ))}

          {editingFamily && (
            <>
              <ParticipantChips members={members} me={me} name="participants" selected={participants} />

              <fieldset>
                <legend className="label">¿Quién lo ve?</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(VISIBILITY_LABEL)
                    // "Solo yo" ahora vive en tu agenda personal; aquí solo se muestra si ya estaba así.
                    .filter(([k]) => k !== "privado" || event?.visibility === "privado")
                    .map(([k, v]) => (
                      <ChoiceCard key={k} name="visibility" value={k} checked={(event?.visibility ?? "familia") === k} Icon={k === "familia" ? Users : k === "ocupado" ? Clock : Lock} label={v.label} hint={v.hint} />
                    ))}
                </div>
              </fieldset>
            </>
          )}

          <Field label="Lugar">
            <input className="input" name="location" maxLength={160} defaultValue={event?.location ?? ""} placeholder="Ej: CESFAM, Colegio, Av. Irarrázaval 1234" />
          </Field>
          <Field label="Notas">
            <textarea className="input min-h-24" name="notes" maxLength={2000} defaultValue={event?.notes ?? ""} placeholder="Ej: Llevar el carnet y la orden médica" />
          </Field>
          <Field
            label="Invitar por correo (opcional)"
            hint="Separa los correos con comas. No necesitan cuenta: les llega la fecha, hora, lugar y notas, y otro correo si algo cambia o se cancela. Máximo 20."
          >
            <textarea
              className="input min-h-20"
              name="guests"
              maxLength={6000}
              defaultValue={guests.join(", ")}
              placeholder="Ej: abuela@gmail.com, tia.carmen@hotmail.com"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </Field>
        </div>
      </details>

      {!whoSees && personal && <input type="hidden" name="visibility" value="privado" />}

      <div className="flex gap-3">
        <SubmitButton className="btn-primary flex-1">{submitLabel}</SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
