import type { SupabaseClient } from "@supabase/supabase-js";
import { getReactionStates } from "@/lib/data";
import type { Post } from "@/lib/types";
import { PostCard } from "./PostCard";

export async function PostList({
  supabase,
  posts,
  viewerId,
  empty,
}: {
  supabase: SupabaseClient;
  posts: Post[];
  viewerId: string | null;
  empty: React.ReactNode;
}) {
  if (posts.length === 0) return <div className="card p-8 text-center text-muted">{empty}</div>;
  const states = await getReactionStates(supabase, posts, viewerId);
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} reactions={states[post.id]} viewerId={viewerId} />
      ))}
    </div>
  );
}
