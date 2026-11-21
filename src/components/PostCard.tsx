import Link from "next/link";
import { deletePost } from "@/app/actions";
import { hostname, timeAgo } from "@/lib/format";
import { mediaUrl } from "@/lib/supabase/env";
import type { Post, ReactionState } from "@/lib/types";
import { Avatar } from "./Avatar";
import { ConfirmButton } from "./ConfirmButton";
import { ReactionBar } from "./ReactionBar";
import { ReportButton } from "./ReportButton";

export function PostCard({
  post,
  reactions,
  viewerId,
  linkToPost = true,
}: {
  post: Post;
  reactions: ReactionState;
  viewerId: string | null;
  linkToPost?: boolean;
}) {
  const isAuthor = viewerId === post.author_id;
  const image = mediaUrl(post.image_path);
  const commentCount = post.comments?.[0]?.count ?? 0;

  return (
    <article className="card animate-in space-y-3 p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <Link href={`/u/${post.author.username}`}>
          <Avatar profile={post.author} />
        </Link>
        <div className="min-w-0 flex-1 text-sm">
          <Link href={`/u/${post.author.username}`} className="font-semibold hover:underline">
            {post.author.display_name}
          </Link>{" "}
          <span className="text-muted">@{post.author.username}</span>
          <div className="text-xs text-muted">
            <Link href={`/p/${post.id}`} className="hover:underline">
              <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
            </Link>
            {post.community && (
              <>
                {" · en "}
                <Link href={`/c/${post.community.slug}`} className="font-medium text-brand hover:underline">
                  {post.community.name}
                </Link>
              </>
            )}
          </div>
        </div>
        {isAuthor && (
          <ConfirmButton action={deletePost.bind(null, post.id)} confirmText="¿Eliminar este aporte? No se puede deshacer.">
            Eliminar
          </ConfirmButton>
        )}
        {viewerId && !isAuthor && <ReportButton postId={post.id} />}
      </header>

      <p className="whitespace-pre-wrap break-words leading-relaxed">{post.body}</p>

      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" loading="lazy" className="max-h-[480px] w-full rounded-xl border border-line object-cover" />
      )}

      {post.link_url && (
        <a
          href={post.link_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex items-center gap-2 rounded-xl border border-line bg-soft px-3 py-2 text-sm hover:border-brand/50"
        >
          <span aria-hidden>🔗</span>
          <span className="truncate font-medium">{hostname(post.link_url)}</span>
        </a>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <ReactionBar postId={post.id} state={reactions} isAuthor={isAuthor} isLoggedIn={Boolean(viewerId)} />
        {linkToPost && (
          <Link href={`/p/${post.id}`} className="text-sm text-muted hover:text-brand">
            💬 {commentCount === 0 ? "Comentar" : `${commentCount} ${commentCount === 1 ? "comentario" : "comentarios"}`}
          </Link>
        )}
      </footer>
    </article>
  );
}
