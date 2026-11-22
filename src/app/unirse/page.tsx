import Link from "next/link";
import { requireUser } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { Field, Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { joinFamily } from "./actions";

export const metadata = { title: "Unirme a una familia" };

type Preview = { id: string; name: string; open_members: { id: string; name: string; kind: string }[] };

export default async function Unirse({ searchParams }: PageProps<"/unirse">) {
  await requireUser();
  const sp = await searchParams;
  const codigo = typeof sp.codigo === "string" ? sp.codigo.trim().toUpperCase() : "";
  const error = typeof sp.error === "string" ? sp.error : undefined;

  let preview: Preview | null = null;
  if (codigo) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("family_by_code", { p_code: codigo });
    preview = (data as Preview[] | null)?.[0] ?? null;
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <Link href="/inicio?lista=1" className="btn-ghost -ml-3 min-h-9 py-1.5">
          ← Volver
        </Link>
        <h1 className="mt-3 text-4xl font-semibold">{preview ? `Únete a ${preview.name}` : "Unirme a una familia"}</h1>
        <div className="mt-6">
          <Flash error={error ?? (codigo && !preview ? "No encontramos una familia con ese código." : undefined)} />
        </div>

        {!preview ? (
          <form method="get" className="card space-y-4">
            <Field label="Código de invitación" hint="Son 8 letras y números. Lo encuentras en la sección Familia de quien te invitó.">
              <input className="input font-mono uppercase tracking-widest" name="codigo" required maxLength={12} defaultValue={codigo} autoComplete="off" placeholder="A1B2C3D4" />
            </Field>
            <button className="btn-primary w-full">Continuar</button>
          </form>
        ) : (
          <form action={joinFamily} className="card space-y-4">
            <input type="hidden" name="codigo" value={codigo} />
            <fieldset className="space-y-2">
              <legend className="label">¿Quién eres?</legend>
              {preview.open_members.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                  <input type="radio" name="member_id" value={m.id} className="accent-[var(--accent)]" />
                  <span className="font-medium">Soy {m.name}</span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="radio" name="member_id" value="" defaultChecked={!preview.open_members.length} className="accent-[var(--accent)]" />
                <span className="font-medium">Soy otra persona</span>
              </label>
            </fieldset>
            <Field label="Si eres otra persona, ¿cómo te llaman?">
              <input className="input" name="name" maxLength={40} placeholder="Ej: Tía Carmen" />
            </Field>
            <SubmitButton className="btn-primary w-full" pendingText="Uniéndome…">
              Unirme a la familia
            </SubmitButton>
          </form>
        )}
      </main>
    </>
  );
}
