import Link from "next/link";
import { requireActive } from "@/lib/community";
import { profileNames } from "@/lib/files";
import { Badge, Empty, Flash, PageTitle } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { TICKET_KIND_LABEL, TICKET_STATUS_LABEL, fecha } from "@/lib/format";
import { toggleVote } from "./actions";

type Ticket = {
  id: string;
  kind: string;
  title: string;
  body: string;
  status: string;
  is_public: boolean;
  author_id: string | null;
  created_at: string;
  ticket_votes: { user_id: string }[];
  ticket_comments: { count: number }[];
};

const STATUS_TONE: Record<string, "neutral" | "accent" | "ok"> = { abierto: "neutral", en_revision: "accent", resuelto: "ok", cerrado: "neutral" };

export default async function Reclamos({ params, searchParams }: PageProps<"/c/[id]/reclamos">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, canManage } = await requireActive(id);
  const filtro = typeof sp.ver === "string" ? sp.ver : "todos";

  let q = supabase
    .from("tickets")
    .select("id, kind, title, body, status, is_public, author_id, created_at, ticket_votes(user_id), ticket_comments(count)")
    .eq("community_id", id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (filtro === "mios") q = q.eq("author_id", user.id);
  if (filtro === "sugerencias") q = q.eq("kind", "sugerencia");
  if (filtro === "abiertos") q = q.in("status", ["abierto", "en_revision"]);
  const { data } = await q.returns<Ticket[]>();
  const tickets = data ?? [];
  const names = await profileNames(supabase, tickets.map((t) => t.author_id));

  const tabs = [
    { key: "todos", label: canManage ? "Todos" : "Comunidad" },
    { key: "abiertos", label: "Abiertos" },
    { key: "sugerencias", label: "Sugerencias" },
    { key: "mios", label: "Míos" },
  ];

  return (
    <div>
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
      <PageTitle
        sub={canManage ? "Ves todos los casos, incluidos los privados." : "Ves los casos públicos de la comunidad y los tuyos."}
        action={
          <Link href={`/c/${id}/reclamos/nuevo`} className="btn-primary">
            ＋ Nuevo
          </Link>
        }
      >
        Reclamos y sugerencias
      </PageTitle>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/c/${id}/reclamos?ver=${t.key}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${filtro === t.key ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tickets.length === 0 ? (
        <Empty>No hay casos para mostrar.</Empty>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const voted = t.ticket_votes.some((v) => v.user_id === user.id);
            const comments = t.ticket_comments[0]?.count ?? 0;
            return (
              <article key={t.id} className="card flex gap-4">
                {t.kind === "sugerencia" && t.is_public && (
                  <form action={toggleVote.bind(null, id, t.id, voted, "lista")} className="shrink-0">
                    <SubmitButton
                      className={`flex w-14 flex-col items-center rounded-xl border px-2 py-2 text-sm font-semibold ${voted ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:border-accent"}`}
                      pendingText="…"
                    >
                      <span aria-hidden>▲</span>
                      {t.ticket_votes.length}
                      <span className="sr-only">{voted ? "Quitar apoyo" : "Apoyar"}</span>
                    </SubmitButton>
                  </form>
                )}
                <Link href={`/c/${id}/reclamos/${t.id}`} className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge tone={t.kind === "reclamo" ? "warn" : t.kind === "sugerencia" ? "accent" : "neutral"}>{TICKET_KIND_LABEL[t.kind]}</Badge>
                    <Badge tone={STATUS_TONE[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Badge>
                    {!t.is_public && <span className="text-xs text-muted">🔒 Privado</span>}
                  </div>
                  <h3 className="font-semibold hover:text-accent">{t.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{t.body}</p>
                  <p className="mt-2 text-xs text-muted">
                    {t.author_id === user.id ? "Tú" : (names[t.author_id ?? ""] ?? "Vecino/a")} · {fecha(t.created_at)}
                    {comments > 0 && ` · ${comments} ${comments === 1 ? "respuesta" : "respuestas"}`}
                  </p>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
