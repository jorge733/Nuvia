import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteComment } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PostCard } from "@/components/PostCard";
import { getReactionStates, getViewer, POST_SELECT } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import type { Comment, Post } from "@/lib/types";
import { CommentForm } from "./CommentForm";

type Props = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return {};
  const { supabase } = await getViewer();
  const { data } = await supabase.from("posts").select("body, author:profiles(display_name)").eq("id", id).maybeSingle();
  if (!data) return {};
  const author = (data.author as unknown as { display_name: string } | null)?.display_name ?? "Uniluva";
  return { title: `${author}: “${data.body.slice(0, 60)}${data.body.length > 60 ? "…" : ""}”`, description: data.body.slice(0, 160) };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, user } = await getViewer();

  const [{ data: postData }, { data: commentData }] = await Promise.all([
    supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle(),
    supabase
      .from("comments")
      .select("id, post_id, author_id, body, created_at, author:profiles(id, username, display_name, avatar_url)")
      .eq("post_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!postData) notFound();

  const post = postData as unknown as Post;
  const comments = (commentData ?? []) as unknown as Comment[];
  const states = await getReactionStates(supabase, [post], user?.id ?? null);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/" className="text-sm text-muted hover:text-brand">
        ← Volver
      </Link>
      <PostCard post={post} reactions={states[post.id]} viewerId={user?.id ?? null} linkToPost={false} />

      <section className="space-y-3" aria-labelledby="comentarios">
        <h2 id="comentarios" className="font-semibold">
          {comments.length === 0 ? "Comentarios" : `${comments.length} ${comments.length === 1 ? "comentario" : "comentarios"}`}
        </h2>

        {user ? (
          <CommentForm postId={post.id} />
        ) : (
          <p className="card p-4 text-sm text-muted">
            <Link href={`/entrar?next=/p/${post.id}`} className="font-semibold text-brand hover:underline">
              Entra
            </Link>{" "}
            para sumar a la conversación.
          </p>
        )}

        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="card animate-in flex gap-3 p-4">
              <Link href={`/u/${c.author.username}`}>
                <Avatar profile={c.author} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span>
                    <Link href={`/u/${c.author.username}`} className="font-semibold hover:underline">
                      {c.author.display_name}
                    </Link>
                    {c.author_id === post.author_id && <span className="ml-1 text-xs text-brand">· autor</span>}
                    <span className="ml-2 text-xs text-muted">{timeAgo(c.created_at)}</span>
                  </span>
                  {user?.id === c.author_id && (
                    <ConfirmButton action={deleteComment.bind(null, c.id, post.id)} confirmText="¿Eliminar este comentario?">
                      Eliminar
                    </ConfirmButton>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
