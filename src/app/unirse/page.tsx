import Link from "next/link";
import { requireUser } from "@/lib/community";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { Field, Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { KIND_LABEL, UNIT_WORD } from "@/lib/format";
import { joinCommunity } from "./actions";

export const metadata = { title: "Unirme a una comunidad" };

type Preview = { id: string; name: string; kind: string; comuna: string; units: { id: string; label: string }[] };

export default async function Unirse({ searchParams }: PageProps<"/unirse">) {
  await requireUser();
  const sp = await searchParams;
  const codigo = typeof sp.codigo === "string" ? sp.codigo.trim().toUpperCase() : "";
  const error = typeof sp.error === "string" ? sp.error : undefined;

  let preview: Preview | null = null;
  if (codigo) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("community_by_code", { p_code: codigo });
    preview = (data as Preview[] | null)?.[0] ?? null;
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <Link href="/inicio?lista=1" className="link text-sm">
          ← Volver
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Unirme a una comunidad</h1>
        <div className="mt-6">
          <Flash error={error ?? (codigo && !preview ? "No encontramos una comunidad con ese código." : undefined)} />
        </div>

        {!preview ? (
          <form method="get" className="card space-y-4">
            <Field label="Código de invitación" hint="Son 8 letras y números. Te lo entrega tu administración o comité.">
              <input
                className="input font-mono uppercase tracking-widest"
                name="codigo"
                required
                maxLength={12}
                defaultValue={codigo}
                autoComplete="off"
                placeholder="A1B2C3D4"
              />
            </Field>
            <button className="btn-primary w-full">Continuar</button>
          </form>
        ) : (
          <form action={joinCommunity} className="card space-y-4">
            <input type="hidden" name="codigo" value={codigo} />
            <div>
              <div className="text-sm text-muted">
                {KIND_LABEL[preview.kind]} · {preview.comuna}
              </div>
              <div className="text-lg font-semibold">{preview.name}</div>
            </div>
            {preview.units.length > 0 ? (
              <Field label={UNIT_WORD[preview.kind]}>
                <select className="input" name="unit_id" required defaultValue="">
                  <option value="" disabled>
                    Elige tu unidad
                  </option>
                  {preview.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label={UNIT_WORD[preview.kind]}>
                <input className="input" name="unit_label" required maxLength={30} placeholder="Ej: 304 o Casa 12" />
              </Field>
            )}
            <Field label="Soy">
              <select className="input" name="relation" defaultValue="propietario">
                <option value="propietario">Propietario/a</option>
                <option value="arrendatario">Arrendatario/a</option>
                <option value="otro">Otro (familiar, residente)</option>
              </select>
            </Field>
            <p className="text-sm text-muted">La administración revisará tu solicitud antes de darte acceso.</p>
            <SubmitButton className="btn-primary w-full" pendingText="Enviando…">
              Solicitar unirme
            </SubmitButton>
          </form>
        )}
      </main>
    </>
  );
}
