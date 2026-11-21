import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Post, Profile, ReactionKind, ReactionState } from "./types";

export const POST_SELECT =
  "id, author_id, community_id, body, link_url, image_path, created_at, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url), community:communities(id, slug, name), comments(count)";

/** Usuario y perfil actual (cacheado por request). */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return { supabase, user, profile: (profile as Profile | null) ?? null };
});

export async function getReactionStates(
  supabase: SupabaseClient,
  posts: Post[],
  userId: string | null,
): Promise<Record<string, ReactionState>> {
  const states: Record<string, ReactionState> = {};
  for (const p of posts) {
    states[p.id] = {
      mine: [],
      counts: p.author_id === userId ? { aprendi: 0, ayudo: 0, inspiro: 0 } : null,
    };
  }
  if (!userId || posts.length === 0) return states;

  // RLS devuelve solo: mis reacciones + las reacciones a mis aportes.
  const { data } = await supabase
    .from("reactions")
    .select("post_id, user_id, kind")
    .in(
      "post_id",
      posts.map((p) => p.id),
    );

  for (const r of (data ?? []) as { post_id: string; user_id: string; kind: ReactionKind }[]) {
    const s = states[r.post_id];
    if (!s) continue;
    if (r.user_id === userId) s.mine.push(r.kind);
    if (s.counts) s.counts[r.kind] += 1;
  }
  return states;
}

export async function getUnreadCount(supabase: SupabaseClient, userId: string) {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
