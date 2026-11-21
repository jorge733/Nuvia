import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { PostList } from "@/components/PostList";
import { getViewer, POST_SELECT } from "@/lib/data";
import type { Post, Profile } from "@/lib/types";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const { supabase } = await getViewer();
  const { data } = await supabase.from("profiles").select("display_name, bio").eq("username", username.toLowerCase()).maybeSingle();
  return data ? { title: `${data.display_name} (@${username})`, description: data.bio ?? undefined } : {};
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const { supabase, user } = await getViewer();

  const { data: profileData } = await supabase.from("profiles").select("*").eq("username", username.toLowerCase()).maybeSingle();
  if (!profileData) notFound();
  const profile = profileData as Profile;

  const [{ data: posts }, { data: rep }, { data: memberships }] = await Promise.all([
    supabase.from("posts").select(POST_SELECT).eq("author_id", profile.id).order("created_at", { ascending: false }).limit(30),
    supabase.rpc("reputation", { p_user: profile.id }),
    supabase.from("community_members").select("community:communities(slug, name)").eq("user_id", profile.id),
  ]);

  const reputation = (rep ?? []) as { community_id: string | null; community_name: string | null; community_slug: string | null; points: number }[];
  const total = reputation.reduce((a, r) => a + Number(r.points), 0);
  const communities = ((memberships ?? []) as unknown as { community: { slug: string; name: string } }[]).map((m) => m.community).filter(Boolean);
  const isMe = user?.id === profile.id;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="card animate-in space-y-4 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <Avatar profile={profile} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{profile.display_name}</h1>
            <p className="text-muted">@{profile.username}</p>
            <p className="mt-1 text-xs text-muted">
              En Uniluva desde {new Date(profile.created_at).toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
            </p>
          </div>
          {isMe && (
            <Link href="/ajustes" className="btn-ghost">
              Editar
            </Link>
          )}
        </div>
        {profile.bio && <p className="whitespace-pre-wrap">{profile.bio}</p>}

        <div>
          <h2 className="mb-2 text-sm font-semibold">
            Reputación por aportes <span className="font-normal text-muted">· {total} pts</span>
          </h2>
          {reputation.length === 0 ? (
            <p className="text-sm text-muted">Todavía sin reputación. Se gana cuando un aporte ayuda, enseña o inspira a otros.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {reputation.map((r) => (
                <li key={r.community_id ?? "general"}>
                  {r.community_slug ? (
                    <Link href={`/c/${r.community_slug}`} className="chip hover:border-brand/50">
                      {r.community_name} · <strong>{r.points}</strong>
                    </Link>
                  ) : (
                    <span className="chip">General · <strong>{r.points}</strong></span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {communities.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">Comunidades</h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {communities.map((c) => (
                <li key={c.slug}>
                  <Link href={`/c/${c.slug}`} className="text-brand hover:underline">{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <h2 className="font-semibold">Aportes</h2>
      <PostList
        supabase={supabase}
        posts={(posts ?? []) as unknown as Post[]}
        viewerId={user?.id ?? null}
        empty={isMe ? "Aún no compartes nada. Tu primer aporte puede ayudar a alguien hoy." : "Sin aportes por ahora."}
      />
    </div>
  );
}
