import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { markAllNotificationsRead } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { getViewer } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { REACTIONS, type Notification } from "@/lib/types";

export const metadata: Metadata = { title: "Avisos" };

export default async function NotificationsPage() {
  const { supabase, user } = await getViewer();
  if (!user) redirect("/entrar?next=/notificaciones");

  const { data } = await supabase
    .from("notifications")
    .select("id, type, reaction_kind, read_at, created_at, post_id, actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_url), post:posts(id, body)")
    .order("created_at", { ascending: false })
    .limit(60);
  const items = (data ?? []) as unknown as Notification[];
  const hasUnread = items.some((n) => !n.read_at);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Avisos</h1>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <button className="btn-ghost">Marcar todo como leído</button>
          </form>
        )}
      </header>

      {items.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          Aquí verás cuando alguien comente tus aportes o te cuente que le ayudaron.
        </div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map((n) => {
            const reaction = REACTIONS.find((r) => r.kind === n.reaction_kind);
            const name = n.actor?.display_name ?? "Alguien";
            return (
              <li key={n.id}>
                <Link href={n.post_id ? `/p/${n.post_id}` : "#"} className={`flex gap-3 p-4 transition hover:bg-soft ${n.read_at ? "" : "bg-brand/5"}`}>
                  {n.actor ? <Avatar profile={n.actor} size="sm" /> : <span className="size-8" />}
                  <div className="min-w-0 flex-1 text-sm">
                    <p>
                      <strong>{name}</strong>{" "}
                      {n.type === "comment" ? "comentó tu aporte" : <>reaccionó a tu aporte: {reaction?.emoji} <em>{reaction?.label}</em></>}
                    </p>
                    {n.post && <p className="truncate text-muted">“{n.post.body}”</p>}
                    <p className="mt-0.5 text-xs text-muted">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label="Sin leer" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
