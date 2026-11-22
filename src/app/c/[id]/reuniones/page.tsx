import { requireActive } from "@/lib/community";
import { signedUrls } from "@/lib/files";
import { Badge, Details, Empty, Field, Flash, PageTitle, SectionHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { fechaHora } from "@/lib/format";
import { createMeeting, deleteMeeting, rsvp, uploadMinutes } from "./actions";

type Meeting = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  online_url: string | null;
  agenda: string | null;
  minutes_path: string | null;
  meeting_rsvps: { user_id: string; attending: boolean }[];
};

// Una reunión sigue "próxima" hasta 3 horas después de su inicio.
function splitMeetings(meetings: Meeting[]) {
  const cutoff = Date.now() - 3 * 3600_000;
  return {
    upcoming: meetings.filter((m) => new Date(m.starts_at).getTime() > cutoff).reverse(),
    past: meetings.filter((m) => new Date(m.starts_at).getTime() <= cutoff),
  };
}

export default async function Reuniones({ params, searchParams }: PageProps<"/c/[id]/reuniones">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, canManage } = await requireActive(id);

  const { data } = await supabase
    .from("meetings")
    .select("id, title, starts_at, location, online_url, agenda, minutes_path, meeting_rsvps(user_id, attending)")
    .eq("community_id", id)
    .order("starts_at", { ascending: false })
    .limit(50)
    .returns<Meeting[]>();

  const { upcoming, past } = splitMeetings(data ?? []);
  const urls = await signedUrls(supabase, past.map((m) => m.minutes_path));

  const card = (m: Meeting, isPast: boolean) => {
    const mine = m.meeting_rsvps.find((r) => r.user_id === user.id);
    const yes = m.meeting_rsvps.filter((r) => r.attending).length;
    return (
      <article key={m.id} id={`r-${m.id}`} className="card scroll-mt-28">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">{m.title}</h3>
            <p className="text-sm capitalize">{fechaHora(m.starts_at)}</p>
            {m.location && <p className="text-sm text-muted">📍 {m.location}</p>}
          </div>
          {!isPast && <Badge tone="accent">{yes} confirmados</Badge>}
        </div>
        {m.agenda && (
          <div className="mt-3 rounded-xl bg-surface-2 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Tabla</p>
            <p className="whitespace-pre-line text-sm">{m.agenda}</p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {!isPast && (
            <>
              <form action={rsvp.bind(null, id, m.id, true)}>
                <SubmitButton className={mine?.attending ? "btn-primary" : "btn-secondary"} pendingText="…">
                  {mine?.attending ? "✓ Asistiré" : "Asistiré"}
                </SubmitButton>
              </form>
              <form action={rsvp.bind(null, id, m.id, false)}>
                <SubmitButton className={mine && !mine.attending ? "btn-primary" : "btn-secondary"} pendingText="…">
                  No podré
                </SubmitButton>
              </form>
              <a href={`/c/${id}/reuniones/${m.id}/ics`} className="btn-secondary">
                📅 Agregar al calendario
              </a>
              {m.online_url && (
                <a href={m.online_url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  🎥 Unirse en línea
                </a>
              )}
            </>
          )}
          {isPast && m.minutes_path && urls[m.minutes_path] && (
            <a className="btn-secondary" href={urls[m.minutes_path]} target="_blank" rel="noopener noreferrer">
              📄 Ver acta
            </a>
          )}
        </div>
        {canManage && (
          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
            {isPast && (
              <form action={uploadMinutes.bind(null, id, m.id)} className="flex flex-1 flex-wrap items-end gap-2">
                <label className="min-w-48 flex-1">
                  <span className="label text-xs">{m.minutes_path ? "Reemplazar acta" : "Subir acta"}</span>
                  <input className="input" type="file" name="minutes" accept=".pdf,image/*,.docx" required />
                </label>
                <SubmitButton className="btn-secondary" pendingText="Subiendo…">
                  Subir
                </SubmitButton>
              </form>
            )}
            <form action={deleteMeeting.bind(null, id, m.id)}>
              <SubmitButton className="btn-danger" confirm="¿Eliminar esta reunión?" pendingText="…">
                Eliminar
              </SubmitButton>
            </form>
          </div>
        )}
      </article>
    );
  };

  return (
    <div>
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
      <PageTitle>Reuniones</PageTitle>

      {canManage && (
        <div className="mb-8">
          <Details summary="＋ Agendar reunión o asamblea">
            <form action={createMeeting.bind(null, id)} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Título">
                  <input className="input" name="title" required maxLength={120} placeholder="Asamblea ordinaria de copropietarios" />
                </Field>
              </div>
              <Field label="Fecha y hora (hora de Chile)">
                <input className="input" type="datetime-local" name="starts_at" required />
              </Field>
              <Field label="Lugar">
                <input className="input" name="location" maxLength={160} placeholder="Sala multiuso, piso 1" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Enlace de videollamada (opcional)" hint="La Ley de Copropiedad permite asambleas en línea.">
                  <input className="input" type="url" name="online_url" placeholder="https://meet.google.com/…" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Tabla">
                  <textarea className="input min-h-28" name="agenda" maxLength={4000} placeholder={"1. Cuenta de la administración\n2. Presupuesto 2027\n3. Varios"} />
                </Field>
              </div>
              <div>
                <SubmitButton>Agendar</SubmitButton>
              </div>
            </form>
          </Details>
        </div>
      )}

      <SectionHeader title="Próximas" />
      {upcoming.length ? <div className="space-y-3">{upcoming.map((m) => card(m, false))}</div> : <Empty>No hay reuniones agendadas.</Empty>}

      <div className="mt-10">
        <SectionHeader title="Anteriores" />
        {past.length ? <div className="space-y-3">{past.map((m) => card(m, true))}</div> : <Empty>Aún no hay reuniones anteriores.</Empty>}
      </div>
    </div>
  );
}
