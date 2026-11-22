import { requireUser } from "@/lib/community";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { Field, Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { saveProfile } from "./actions";

export const metadata = { title: "Mi perfil" };

export default async function Perfil({ searchParams }: PageProps<"/perfil">) {
  const user = await requireUser();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_profile");
  const profile = (data as { full_name: string; phone: string | null }[] | null)?.[0];
  const welcome = sp.bienvenida === "1";

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">{welcome ? "¡Bienvenido/a a Uniluva!" : "Mi perfil"}</h1>
        <p className="mt-1 text-muted">
          {welcome ? "Cuéntanos tu nombre para que tus vecinos y la administración te reconozcan." : user.email}
        </p>
        <div className="mt-6">
          <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
        </div>
        <form action={saveProfile} className="card space-y-4">
          <input type="hidden" name="welcome" value={welcome ? "1" : ""} />
          <Field label="Nombre y apellido">
            <input className="input" name="full_name" required minLength={2} maxLength={80} defaultValue={profile?.full_name ?? ""} autoComplete="name" />
          </Field>
          <Field label="Teléfono (opcional)" hint="Solo lo ve la administración de tus comunidades.">
            <input className="input" name="phone" type="tel" maxLength={30} defaultValue={profile?.phone ?? ""} autoComplete="tel" placeholder="+56 9 1234 5678" />
          </Field>
          <SubmitButton className="btn-primary w-full">{welcome ? "Continuar" : "Guardar"}</SubmitButton>
        </form>
        <p className="mt-6 text-xs text-muted">
          Para eliminar tu cuenta y tus datos, escríbenos desde la sección de privacidad. Lo hacemos en un plazo máximo de 30 días.
        </p>
      </main>
    </>
  );
}
