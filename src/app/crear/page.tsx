import Link from "next/link";
import { requireUser } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { Field, Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ColorPicker } from "@/components/color-picker";
import { createFamily } from "./actions";

export const metadata = { title: "Crear agenda familiar" };

const ROWS = [
  { placeholder: "Ej: Pedro", kind: "adulto", color: "azul" },
  { placeholder: "Ej: Sofi", kind: "nino", color: "verde" },
  { placeholder: "Ej: Tata", kind: "adulto_mayor", color: "ambar" },
  { placeholder: "Ej: Luna", kind: "mascota", color: "gris" },
  { placeholder: "", kind: "nino", color: "rosa" },
  { placeholder: "", kind: "adulto", color: "turquesa" },
];

export default async function Crear({ searchParams }: PageProps<"/crear">) {
  const user = await requireUser();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-xl px-4 py-8">
        <Link href="/inicio?lista=1" className="btn-ghost -ml-3 min-h-9 py-1.5">
          ← Volver
        </Link>
        <h1 className="mt-3 text-4xl font-semibold">La agenda de tu familia</h1>
        <p className="mt-1 text-muted">Después podrás invitar a los demás adultos con un enlace.</p>
        <div className="mt-6">
          <Flash error={typeof sp.error === "string" ? sp.error : undefined} />
        </div>

        <form action={createFamily} className="space-y-5">
          <div className="card space-y-4">
            <Field label="Nombre de la familia">
              <input className="input" name="name" required minLength={2} maxLength={60} placeholder="Familia Pérez Soto" />
            </Field>
            <Field label="¿Cómo te llaman en tu familia?" hint="Puede ser tu nombre o algo como “Mamá” o “Papá”.">
              <input className="input" name="my_name" required maxLength={40} defaultValue={firstName} />
            </Field>
            <div>
              <span className="label">Tu color</span>
              <ColorPicker name="my_color" defaultValue="violeta" />
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold">¿Quiénes más son parte?</h2>
            <p className="mt-1 text-sm text-muted">Agrega a todos, también a quienes no usarán la app. Lo puedes completar después.</p>
            <div className="mt-4 space-y-2">
              {ROWS.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input flex-1" name={`m_name_${i}`} maxLength={40} placeholder={r.placeholder || "Nombre"} aria-label={`Nombre ${i + 1}`} />
                  <select className="input w-40" name={`m_kind_${i}`} defaultValue={r.kind} aria-label={`Tipo ${i + 1}`}>
                    <option value="adulto">Adulto/a</option>
                    <option value="nino">Niño/a</option>
                    <option value="adulto_mayor">Adulto/a mayor</option>
                    <option value="mascota">Mascota</option>
                  </select>
                  <input type="hidden" name={`m_color_${i}`} value={r.color} />
                </div>
              ))}
            </div>
          </div>

          <SubmitButton className="btn-primary w-full" pendingText="Creando…">
            Crear agenda familiar
          </SubmitButton>
        </form>
      </main>
    </>
  );
}
