import Link from "next/link";
import { House, Link2 } from "lucide-react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { Flash } from "@/components/ui";
import { MemberAvatar } from "@/components/member-avatar";

export const metadata = { title: "Mis familias" };

type Row = { id: string; name: string; color: string; kind: "adulto"; families: { id: string; name: string } | null };

export default async function Inicio({ searchParams }: PageProps<"/inicio">) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data }, { data: profile }] = await Promise.all([
    supabase.from("family_members").select("id, name, color, kind, families(id, name)").eq("user_id", user.id).order("created_at").returns<Row[]>(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!profile?.full_name) redirect("/perfil?bienvenida=1");

  const rows = (data ?? []).filter((r) => r.families);
  if (rows.length === 1 && !sp.lista) redirect(`/f/${rows[0].families!.id}`);

  return (
    <>
      <AppHeader userInitial={profile.full_name.charAt(0).toUpperCase()} />
      <main className="mx-auto w-full max-w-xl px-4 py-8">
        <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
        <p className="eyebrow">Bienvenido/a</p>
        <h1 className="mt-1 text-4xl font-semibold">Hola, {profile.full_name.split(" ")[0]}</h1>
        <p className="mt-2 text-muted">{rows.length ? "Elige una agenda familiar." : "Empecemos por tu familia."}</p>

        <div className="mt-6 space-y-3">
          {rows.map((r) => (
            <Link key={r.families!.id} href={`/f/${r.families!.id}`} className="card flex items-center gap-4 transition hover:ring-2 hover:ring-accent/30">
              <MemberAvatar member={r} size={48} />
              <div className="min-w-0">
                <div className="truncate font-display text-xl font-semibold">{r.families!.name}</div>
                <div className="text-sm text-muted">Eres {r.name}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link href="/crear" className="card transition hover:ring-2 hover:ring-accent/30">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
              <House className="size-5" />
            </span>
            <div className="mt-4 font-display text-xl font-semibold">Crear la agenda de mi familia</div>
            <p className="mt-1 text-sm text-muted">Agrega a quienes viven contigo, aunque no usen la app: niños, abuelos o mascotas.</p>
          </Link>
          <Link href="/unirse" className="card transition hover:ring-2 hover:ring-accent/30">
            <span className="grid size-11 place-items-center rounded-2xl bg-sun-soft text-sun">
              <Link2 className="size-5" />
            </span>
            <div className="mt-4 font-display text-xl font-semibold">Unirme con una invitación</div>
            <p className="mt-1 text-sm text-muted">Alguien de tu familia te envió un enlace o un código.</p>
          </Link>
        </div>
      </main>
    </>
  );
}
