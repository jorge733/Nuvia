import Link from "next/link";
import { CalendarPlus, MapPin, Repeat } from "lucide-react";
import { getGuestEvent } from "@/lib/guest";
import { CATEGORIES } from "@/lib/format";
import { RECURRENCE_LABEL, capitalize, dayKey, formatDay, timeOf } from "@/lib/time";
import { Logo } from "@/components/logo";
import { Field, Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { joinSharedEvent } from "../actions";

// Título para la vista previa al compartir el enlace (WhatsApp, etc.).
export async function generateMetadata({ params }: PageProps<"/invitacion/[token]">) {
  const ev = await getGuestEvent((await params).token);
  const robots = { index: false, follow: false };
  if (!ev) return { title: "Invitación", robots };
  const title = `${ev.inviter ? `${ev.inviter} te invitó` : "Te invitaron"}: ${ev.title}`;
  const description = when(ev.starts_at, ev.ends_at, ev.all_day) + (ev.location ? ` · ${ev.location}` : "");
  return { title, description, robots, openGraph: { title, description } };
}

function when(startsAt: string, endsAt: string | null, allDay: boolean) {
  const start = new Date(startsAt);
  const day = capitalize(formatDay(dayKey(start)));
  if (allDay) return `${day} · todo el día`;
  return `${day} · ${timeOf(start)}${endsAt ? `–${timeOf(new Date(endsAt))}` : ""}`;
}

// Lo que ve una persona invitada por correo (no necesita cuenta).
export default async function Invitacion({ params, searchParams }: PageProps<"/invitacion/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const ev = await getGuestEvent(token);

  if (!ev) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold">Esta invitación ya no está disponible</h1>
        <p className="mt-2 text-muted">Puede que la actividad se haya cancelado, que el enlace se haya desactivado o que te hayan quitado de los invitados.</p>
      </main>
    );
  }

  const cat = CATEGORIES[ev.category] ?? CATEGORIES.otro;
  const recurring = ev.recurrence !== "none";
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <div className="flex justify-center">
        <Logo />
      </div>
      <div className="mt-6">
        <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
      </div>
      <p className="mt-2 text-center text-muted">
        {ev.inviter ? `${ev.inviter} te invitó` : "Te invitaron"}
        {ev.family_name ? ` · ${ev.family_name}` : ""}
      </p>

      <article className="card relative mt-4 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-accent" aria-hidden />
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-2xl" aria-hidden>
            {cat.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{cat.label}</p>
            <h1 className="mt-0.5 text-3xl font-semibold">{ev.title}</h1>
          </div>
        </div>
        <dl className="mt-5 space-y-2.5 text-sm">
          <div className="font-semibold">{when(ev.starts_at, ev.ends_at, ev.all_day)}</div>
          {recurring && (
            <div className="flex items-center gap-2 text-muted">
              <Repeat className="size-4" />
              {RECURRENCE_LABEL[ev.recurrence]}
              {ev.recur_until ? ` hasta el ${ev.recur_until.split("-").reverse().join("-")}` : ""}
            </div>
          )}
          {ev.location && (
            <div className="flex items-center gap-2 text-muted">
              <MapPin className="size-4" />
              <a className="link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}`} target="_blank" rel="noopener noreferrer">
                {ev.location}
              </a>
            </div>
          )}
        </dl>
        {ev.notes && <p className="mt-4 whitespace-pre-line rounded-2xl bg-surface-2 p-4 text-sm">{ev.notes}</p>}

        <a href={`/invitacion/${token}/calendario`} className="btn-primary mt-5 w-full">
          <CalendarPlus className="size-4" /> Agregar a mi calendario
        </a>
        <p className="hint text-center">Funciona con Google Calendar, iPhone y Outlook.</p>
      </article>

      {ev.email === null ? (
        <form action={joinSharedEvent.bind(null, token)} className="card mt-6 space-y-3">
          <p className="font-semibold">¿Quieres que te avisemos si cambia?</p>
          <Field label="Tu correo" hint="Te llega la invitación y un aviso si cambia o se cancela. No necesitas cuenta.">
            <input className="input" type="email" name="email" required maxLength={254} autoComplete="email" placeholder="tu@correo.com" />
          </Field>
          <SubmitButton className="btn-secondary w-full" pendingText="…">
            Avísame
          </SubmitButton>
        </form>
      ) : (
        <p className="mt-6 text-center text-sm text-muted">
          {ev.muted ? (
            "Ya no recibes avisos de esta actividad."
          ) : (
            <>
              Te avisaremos a {ev.email} si cambia o se cancela.{" "}
              <a className="link" href={`/api/correo/baja?t=${token}&tipo=invitado`}>
                No quiero avisos
              </a>
            </>
          )}
        </p>
      )}

      <div className="card mt-8 text-center">
        <p className="font-semibold">¿Te gustaría organizar así a tu familia?</p>
        <p className="mt-1 text-sm text-muted">Uniluva es una agenda compartida para repartirse las cosas de la casa.</p>
        <Link href="/" className="btn-secondary mt-4">
          Conocer Uniluva
        </Link>
      </div>
    </main>
  );
}
