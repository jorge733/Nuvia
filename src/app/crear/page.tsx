import Link from "next/link";
import { requireUser } from "@/lib/community";
import { AppHeader } from "@/components/app-header";
import { Field, Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createCommunity } from "./actions";

export const metadata = { title: "Crear comunidad" };

export default async function Crear({ searchParams }: PageProps<"/crear">) {
  await requireUser();
  const sp = await searchParams;
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-xl px-4 py-8">
        <Link href="/inicio?lista=1" className="link text-sm">
          ← Volver
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Crear una comunidad</h1>
        <p className="mt-1 text-muted">Quedarás como administrador/a. Después podrás invitar a tus vecinos con un código o un QR.</p>

        <div className="mt-6">
          <Flash error={typeof sp.error === "string" ? sp.error : undefined} />
        </div>
        <form action={createCommunity} className="card space-y-4">
          <Field label="Nombre">
            <input className="input" name="name" required minLength={2} maxLength={80} placeholder="Edificio Los Aromos / Pasaje Las Rosas" />
          </Field>
          <Field label="Tipo">
            <select className="input" name="kind" defaultValue="edificio">
              <option value="edificio">Edificio</option>
              <option value="condominio">Condominio</option>
              <option value="pasaje">Pasaje</option>
              <option value="vecindario">Vecindario / junta de vecinos</option>
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Comuna" hint="Se usa para mostrar oficios recomendados en tu zona.">
              <input className="input" name="comuna" required minLength={2} maxLength={60} placeholder="Ñuñoa" />
            </Field>
            <Field label="Región">
              <input className="input" name="region" maxLength={60} placeholder="Metropolitana" />
            </Field>
          </div>
          <Field label="Dirección">
            <input className="input" name="address" maxLength={160} placeholder="Av. Ejemplo 1234" />
          </Field>
          <Field
            label="Unidades (opcional)"
            hint="Departamentos o números de casa separados por coma o salto de línea. También puedes usar rangos como 101-110. Puedes agregarlas después."
          >
            <textarea className="input min-h-24" name="units" placeholder={"101-110, 201-210\no bien: 12, 14, 16, 18"} />
          </Field>
          <Field label="Tu unidad (opcional)">
            <input className="input" name="my_unit" maxLength={30} placeholder="304" />
          </Field>
          <SubmitButton className="btn-primary w-full" pendingText="Creando…">
            Crear comunidad
          </SubmitButton>
        </form>
      </main>
    </>
  );
}
