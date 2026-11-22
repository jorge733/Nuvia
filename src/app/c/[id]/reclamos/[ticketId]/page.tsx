import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActive } from "@/lib/community";
import { profileNames } from "@/lib/files";
import { Badge, Field, Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { TICKET_KIND_LABEL, TICKET_STATUS_LABEL, fecha, fechaHora } from "@/lib/format";
import { addComment, deleteTicket, setTicketStatus, toggleVote } from "../actions";

export default async function Ticket({ params, searchParams }: PageProps<"/c/[id]/reclamos/[ticketId]">) {
  const { id, ticketId } = await params;
  const sp = await searchParams;
  const { supabase, user, canManage } = await requireActive(id);

  const [{ data: t }, { data: comments }, { data: votes }] = await Promise.all([
    supabase.from("tickets").select("*").eq("id", ticketId).eq("community_id", id).maybeSingle(),
    supabase.from("ticket_comments").select("id, author_id, body, created_at").eq("ticket_id", ticketId).order("created_at"),
    supabase.from("ticket_votes").select("user_id").eq("ticket_id", ticketId),
  ]);
  if (!t) notFound();

  const managerIds = canManage
    ? []
    : ((await supabase.from("memberships").select("user_id").eq("community_id", id).in("role", ["admin", "comite"]).eq("status", "activo")).data ?? []).map(
        (m) => m.user_id,
      );
  const names = await profileNames(supabase, [t.author_id, ...(comments ?? []).map((c) => c.author_id)]);
  const voted = (votes ?? []).some((v) => v.user_id === user.id);
  const isAuthor = t.author_id === user.id;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/c/${id}/reclamos`} className="link text-sm">
        ← Reclamos y sugerencias
      </Link>
      <div className="mt-3">
        <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
      </div>

      <article className="card">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone={t.kind === "reclamo" ? "warn" : t.kind === "sugerencia" ? "accent" : "neutral"}>{TICKET_KIND_LABEL[t.kind]}</Badge>
          <Badge tone={t.status === "resuelto" ? "ok" : t.status === "en_revision" ? "accent" : "neutral"}>{TICKET_STATUS_LABEL[t.status]}</Badge>
          {!t.is_public && <span className="text-xs text-muted">🔒 Privado: solo tú y la directiva</span>}
        </div>
        <h1 className="text-xl font-bold">{t.title}</h1>
        <p className="mt-1 text-xs text-muted">
          {isAuthor ? "Tú" : (names[t.author_id ?? ""] ?? "Vecino/a")} · {fecha(t.created_at)}
        </p>
        <p className="mt-4 whitespace-pre-line">{t.body}</p>

        <ol className="mt-5 flex items-center gap-2 text-xs" aria-label="Avance">
          {["abierto", "en_revision", "resuelto"].map((s, i) => {
            const order = ["abierto", "en_revision", "resuelto", "cerrado"];
            const reached = order.indexOf(t.status) >= i;
            return (
              <li key={s} className="flex items-center gap-2">
                {i > 0 && <span className={`h-px w-6 ${reached ? "bg-accent" : "bg-line"}`} />}
                <span className={`rounded-full px-2 py-1 ${reached ? "bg-accent-soft font-semibold text-accent" : "bg-surface-2 text-muted"}`}>
                  {TICKET_STATUS_LABEL[s]}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex flex-wrap gap-2">
          {t.kind === "sugerencia" && t.is_public && (
            <form action={toggleVote.bind(null, id, t.id, voted, "detalle")}>
              <SubmitButton className={voted ? "btn-primary" : "btn-secondary"} pendingText="…">
                ▲ {voted ? "Apoyada" : "Apoyar"} · {(votes ?? []).length}
              </SubmitButton>
            </form>
          )}
          {(isAuthor || canManage) && (
            <form action={deleteTicket.bind(null, id, t.id)}>
              <SubmitButton className="btn-danger" confirm="¿Eliminar este caso?" pendingText="…">
                Eliminar
              </SubmitButton>
            </form>
          )}
        </div>
      </article>

      {canManage && (
        <form action={setTicketStatus.bind(null, id, t.id)} className="card mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
          <Field label="Estado">
            <select className="input" name="status" defaultValue={t.status}>
              {Object.entries(TICKET_STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nota para el vecino (opcional)">
            <input className="input" name="note" maxLength={2000} placeholder="Ya coordinamos con el técnico para el jueves." />
          </Field>
          <SubmitButton>Actualizar</SubmitButton>
        </form>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Conversación</h2>
        <div className="space-y-3">
          {(comments ?? []).map((c) => {
            const fromManager = canManage ? c.author_id !== t.author_id : managerIds.includes(c.author_id ?? "");
            return (
              <div key={c.id} className={`rounded-2xl border p-4 ${fromManager ? "border-accent/30 bg-accent-soft" : "border-line bg-surface"}`}>
                <p className="text-xs text-muted">
                  <strong className="text-fg">{c.author_id === user.id ? "Tú" : (names[c.author_id ?? ""] ?? "Vecino/a")}</strong>
                  {fromManager && " · Directiva"} · {fechaHora(c.created_at)}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm">{c.body}</p>
              </div>
            );
          })}
        </div>
        <form action={addComment.bind(null, id, t.id)} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <textarea className="input min-h-12 flex-1" name="body" required maxLength={2000} placeholder="Escribe una respuesta…" />
          <SubmitButton pendingText="…">Responder</SubmitButton>
        </form>
      </section>
    </div>
  );
}
