export type ReactionKind = "aprendi" | "ayudo" | "inspiro";

export const REACTIONS: { kind: ReactionKind; label: string; emoji: string }[] = [
  { kind: "aprendi", label: "Aprendí algo", emoji: "💡" },
  { kind: "ayudo", label: "Me ayudó", emoji: "🤝" },
  { kind: "inspiro", label: "Me inspiró", emoji: "✨" },
];

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type ProfileLite = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

export type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  community_id: string | null;
  body: string;
  link_url: string | null;
  image_path: string | null;
  created_at: string;
  author: ProfileLite;
  community: Pick<Community, "id" | "slug" | "name"> | null;
  comments: { count: number }[];
};

/** Lo que el usuario actual sabe de las reacciones de un aporte. */
export type ReactionState = {
  mine: ReactionKind[];
  /** Solo para el autor del aporte. */
  counts: Record<ReactionKind, number> | null;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: ProfileLite;
};

export type Notification = {
  id: string;
  type: "comment" | "reaction";
  reaction_kind: ReactionKind | null;
  read_at: string | null;
  created_at: string;
  post_id: string | null;
  actor: ProfileLite | null;
  post: { id: string; body: string } | null;
};

export type ActionState = { error?: string; ok?: boolean } | undefined;
