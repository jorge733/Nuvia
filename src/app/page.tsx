import Link from "next/link";
import { Composer } from "@/components/Composer";
import { FeedTabs } from "@/components/FeedTabs";
import { Pager } from "@/components/Pager";
import { PostList } from "@/components/PostList";
import { SetupNotice } from "@/components/SetupNotice";
import { getViewer, POST_SELECT } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function Home({ searchParams }: { searchParams: Promise<{ orden?: string; pagina?: string }> }) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const { orden, pagina } = await searchParams;
  const mode = orden === "recientes" ? "recientes" : "utiles";
  const page = Math.max(1, Number(pagina) || 1);
  const { supabase, user, profile } = await getViewer();

  const [{ data: posts }, { data: memberships }] = await Promise.all([
    supabase
      .rpc("feed", { p_mode: mode, p_limit: PAGE_SIZE + 1, p_offset: (page - 1) * PAGE_SIZE })
      .select(POST_SELECT),
    user
      ? supabase.from("community_members").select("community:communities(id, name)").eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const rows = (posts ?? []) as unknown as Post[];
  const list = rows.slice(0, PAGE_SIZE);
  const hasMore = rows.length > PAGE_SIZE;
  const communities = ((memberships ?? []) as unknown as { community: { id: string; name: string } }[])
    .map((m) => m.community)
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {!user && (
        <section className="card animate-in overflow-hidden p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">Conecta · Descubre · Aporta</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
            Aquí importa lo que aportas,{" "}
            <span className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">no cuántos te siguen.</span>
          </h1>
          <p className="mt-3 max-w-xl text-muted">
            Sin contadores de likes ni de seguidores. Las reacciones dicen <em>cómo</em> te ayudó un aporte, y solo las ve quien lo
            escribió. Lo más útil sube; lo viral no.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/entrar?modo=registro" className="btn-primary px-5 py-2.5">
              Crear cuenta
            </Link>
            <Link href="/c" className="btn-ghost px-5 py-2.5">
              Explorar comunidades
            </Link>
          </div>
        </section>
      )}

      {user && profile && <Composer profile={profile} communities={communities} />}

      <FeedTabs mode={mode} />

      <PostList
        supabase={supabase}
        posts={list}
        viewerId={user?.id ?? null}
        empty={
          <>
            <p className="text-lg font-medium text-fg">Todavía no hay aportes</p>
            <p className="mt-1">{user ? "Sé la primera persona en compartir algo útil." : "Crea una cuenta y comparte el primero."}</p>
          </>
        }
      />

      <Pager page={page} hasMore={hasMore} params={{ orden: mode === "recientes" ? "recientes" : undefined }} />
    </div>
  );
}
