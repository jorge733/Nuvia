import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/community";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { Badge, Flash } from "@/components/ui";
import { KIND_LABEL, ROLE_LABEL } from "@/lib/format";

export const metadata = { title: "Mis comunidades" };

type Row = {
  role: string;
  status: string;
  units: { label: string } | null;
  communities: { id: string; name: string; kind: string; comuna: string } | null;
};

export default async function Inicio({ searchParams }: PageProps<"/inicio">) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from("memberships")
      .select("role, status, units(label), communities(id, name, kind, comuna)")
      .eq("user_id", user.id)
      .neq("status", "rechazado")
      .order("created_at")
      .returns<Row[]>(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  const rows = (data ?? []).filter((r) => r.communities);
  if (!profile?.full_name) redirect("/perfil?bienvenida=1");
  // Con una sola comunidad activa, ir directo a ella (salvo que se pida ver la lista).
  if (rows.length === 1 && rows[0].status === "activo" && !sp.lista) redirect(`/c/${rows[0].communities!.id}`);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
        <h1 className="text-2xl font-bold tracking-tight">Hola, {profile.full_name.split(" ")[0]}</h1>
        <p className="mt-1 text-muted">{rows.length ? "Elige una comunidad." : "Todavía no perteneces a ninguna comunidad."}</p>

        <div className="mt-6 space-y-3">
          {rows.map((r) => (
            <Link key={r.communities!.id} href={`/c/${r.communities!.id}`} className="card flex items-center justify-between gap-3 hover:border-accent">
              <div className="min-w-0">
                <div className="truncate font-semibold">{r.communities!.name}</div>
                <div className="text-sm text-muted">
                  {KIND_LABEL[r.communities!.kind]} · {r.communities!.comuna}
                  {r.units ? ` · ${r.units.label}` : ""}
                </div>
              </div>
              {r.status === "pendiente" ? <Badge tone="warn">Esperando aprobación</Badge> : <Badge>{ROLE_LABEL[r.role]}</Badge>}
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link href="/unirse" className="card hover:border-accent">
            <div className="font-semibold">Unirme con un código</div>
            <p className="mt-1 text-sm text-muted">Tu administración o comité te lo entrega, o escanea el QR de tu edificio.</p>
          </Link>
          <Link href="/crear" className="card hover:border-accent">
            <div className="font-semibold">Crear una comunidad</div>
            <p className="mt-1 text-sm text-muted">Para administradores, comités o vecinos que quieren organizar su pasaje.</p>
          </Link>
        </div>
      </main>
    </>
  );
}
