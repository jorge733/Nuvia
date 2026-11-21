import type { Metadata } from "next";
import Link from "next/link";
import { SetupNotice } from "@/components/SetupNotice";
import { getViewer } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Community } from "@/lib/types";
import { CreateCommunityForm } from "./CreateCommunityForm";

export const metadata: Metadata = { title: "Comunidades" };
export const dynamic = "force-dynamic";

type Row = Community & { community_members: { count: number }[] };

export default async function CommunitiesPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { supabase, user } = await getViewer();

  const [{ data }, { data: mine }] = await Promise.all([
    supabase.from("communities").select("*, community_members(count)").order("created_at", { ascending: false }).limit(100),
    user ? supabase.from("community_members").select("community_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
  ]);
  const joined = new Set(((mine ?? []) as { community_id: string }[]).map((m) => m.community_id));
  const communities = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Comunidades</h1>
        <p className="text-muted">Espacios temáticos donde se gana reputación ayudando, no acumulando seguidores.</p>
      </header>

      {user && <CreateCommunityForm />}

      {communities.length === 0 ? (
        <div className="card p-8 text-center text-muted">Aún no hay comunidades. ¡Crea la primera!</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {communities.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${c.slug}`} className="card animate-in block h-full p-4 transition hover:border-brand/50">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{c.name}</h2>
                  {joined.has(c.id) && <span className="chip px-2 py-0.5 text-xs text-brand">Miembro</span>}
                </div>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>}
                <p className="mt-2 text-xs text-muted">
                  {c.community_members?.[0]?.count ?? 0} {c.community_members?.[0]?.count === 1 ? "miembro" : "miembros"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
