import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { joinCommunity, leaveCommunity } from "@/app/actions";
import { Composer } from "@/components/Composer";
import { FeedTabs } from "@/components/FeedTabs";
import { Pager } from "@/components/Pager";
import { PostList } from "@/components/PostList";
import { getViewer, POST_SELECT } from "@/lib/data";
import type { Community, Post } from "@/lib/types";
import Link from "next/link";

const PAGE_SIZE = 20;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ orden?: string; pagina?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { supabase } = await getViewer();
  const { data } = await supabase.from("communities").select("name, description").eq("slug", slug).maybeSingle();
  return data ? { title: data.name, description: data.description ?? undefined } : {};
}

export default async function CommunityPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { orden, pagina } = await searchParams;
  const mode = orden === "recientes" ? "recientes" : "utiles";
  const page = Math.max(1, Number(pagina) || 1);
  const { supabase, user, profile } = await getViewer();

  const { data: community } = await supabase
    .from("communities")
    .select("*, community_members(count)")
    .eq("slug", slug)
    .maybeSingle();
  if (!community) notFound();
  const c = community as Community & { community_members: { count: number }[] };

  const [{ data: posts }, { data: membership }] = await Promise.all([
    supabase
      .rpc("feed", { p_mode: mode, p_community: c.id, p_limit: PAGE_SIZE + 1, p_offset: (page - 1) * PAGE_SIZE })
      .select(POST_SELECT),
    user
      ? supabase.from("community_members").select("role").match({ community_id: c.id, user_id: user.id }).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const rows = (posts ?? []) as unknown as Post[];
  const list = rows.slice(0, PAGE_SIZE);
  const isMember = Boolean(membership);
  const members = c.community_members?.[0]?.count ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="card animate-in overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand to-accent" />
        <div className="space-y-2 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{c.name}</h1>
              <p className="text-sm text-muted">
                {members} {members === 1 ? "miembro" : "miembros"}
                {membership?.role === "admin" && " · Administras esta comunidad"}
              </p>
            </div>
            {user ? (
              isMember ? (
                membership?.role !== "admin" && (
                  <form action={leaveCommunity.bind(null, c.id, c.slug)}>
                    <button className="btn-ghost">Salir</button>
                  </form>
                )
              ) : (
                <form action={joinCommunity.bind(null, c.id, c.slug)}>
                  <button className="btn-primary">Unirme</button>
                </form>
              )
            ) : (
              <Link href={`/entrar?next=/c/${c.slug}`} className="btn-primary">
                Unirme
              </Link>
            )}
          </div>
          {c.description && <p className="text-muted">{c.description}</p>}
        </div>
      </header>

      {user && profile && isMember && (
        <Composer profile={profile} fixedCommunityId={c.id} placeholder={`Comparte algo útil en ${c.name}…`} />
      )}

      <FeedTabs mode={mode} base={`/c/${c.slug}`} />

      <PostList
        supabase={supabase}
        posts={list}
        viewerId={user?.id ?? null}
        empty={isMember ? "Nadie ha publicado aquí todavía. ¡Abre la conversación!" : "Únete para ser la primera persona en aportar."}
      />

      <Pager page={page} hasMore={rows.length > PAGE_SIZE} params={{ orden: mode === "recientes" ? "recientes" : undefined }} />
    </div>
  );
}
