import Link from "next/link";
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

export function EventForm({
  action,
  members,
  me,
  event,
  defaultDate,
  defaultTime,
  submitLabel,
  cancelHref,
  personal = false,
}: {
  action: (formData: FormData) => Promise<void>;
  members: Member[];
  me: Member;
  event?: AgendaEvent;
  defaultDate: string;
  /** Hora sugerida (al tocar un horario en el calendario). */
  defaultTime?: string;
  submitLabel: string;
  cancelHref: string;
  /** Agenda personal: sin responsable, participantes ni visibilidad. */
  personal?: boolean;
}) {
  const start = event ? new Date(event.starts_at) : null;
  const end = event?.ends_at ? new Date(event.ends_at) : null;
  const participants = new Set(event?.participant_ids ?? []);
  // Las mascotas pueden ser "para quién" (veterinario), pero no responsables.
  const canBeResponsible = members.filter((m) => m.kind !== "mascota");
  const hasExtras = !!(event && (event.recurrence !== "none" || event.location || event.notes || event.participant_ids.length || event.visibility !== "familia"));

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

        {!personal && (
          <fieldset>
            <legend className="label">¿Quién se encarga?</legend>
            <div className="flex flex-wrap gap-2">
              {canBeResponsible.map((m) => (
                <label key={m.id} className="cursor-pointer">
                  <input type="radio" name="responsible" value={m.id} defaultChecked={event ? event.responsible_id === m.id : m.id === me.id} className="peer sr-only" />
                  <span className="inline-flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 text-sm peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                    <MemberAvatar member={m} size={26} />
                    {m.id === me.id ? "Yo" : m.name}
                  </span>
                </label>
              ))}
              <label className="cursor-pointer">
                <input type="radio" name="responsible" value="" defaultChecked={event ? !event.responsible_id : false} className="peer sr-only" />
                <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-line py-1 pr-3 pl-1 text-sm text-muted peer-checked:border-sun peer-checked:bg-sun-soft peer-checked:text-sun peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                  <MemberAvatar member={null} size={26} />
                  Que alguien lo tome
                </span>
              </label>
            </div>
          </fieldset>
        )}
      </div>

      <details className="card" open={hasExtras}>
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
          Más opciones
          <span className="text-sm font-normal text-muted">tipo, repetir, para quién, lugar…</span>
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

          {!personal && (
            <>
              <fieldset>
                <legend className="label">¿Para quién es?</legend>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <label key={m.id} className="cursor-pointer">
                      <input type="checkbox" name="participants" value={m.id} defaultChecked={participants.has(m.id)} className="peer sr-only" />
                      <span className="inline-flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 text-sm peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                        <MemberAvatar member={m} size={24} />
                        {m.id === me.id ? "Yo" : m.name}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="label">¿Quién lo ve?</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {Object.entries(VISIBILITY_LABEL).map(([k, v]) => (
                    <label key={k} className="flex cursor-pointer gap-2 rounded-2xl border border-line p-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                      <input type="radio" name="visibility" value={k} defaultChecked={(event?.visibility ?? "familia") === k} className="mt-0.5 accent-[var(--accent)]" />
                      <span>
                        <span className="block text-sm font-medium">{v.label}</span>
                        <span className="block text-xs text-muted">{v.hint}</span>
                      </span>
                    </label>
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
        </div>
      </details>

      {personal && <input type="hidden" name="visibility" value="privado" />}

      <div className="flex gap-3">
        <SubmitButton className="btn-primary flex-1">{submitLabel}</SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
