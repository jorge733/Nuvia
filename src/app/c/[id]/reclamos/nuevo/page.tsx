import Link from "next/link";
import { requireActive } from "@/lib/community";
import { Field, Flash, PageTitle } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createTicket } from "../actions";

const OPTIONS = [
  { value: "reclamo", label: "Reclamo", hint: "Algo que no funciona o una molestia: luces, ruidos, aseo, filtraciones." },
  { value: "sugerencia", label: "Sugerencia", hint: "Una idea para mejorar la comunidad. Si es pública, los vecinos pueden apoyarla." },
  { value: "consulta_admin", label: "Mensaje a la administración", hint: "Siempre privado. Solo lo ve la directiva." },
];

export default async function NuevoTicket({ params, searchParams }: PageProps<"/c/[id]/reclamos/nuevo">) {
  const { id } = await params;
  const sp = await searchParams;
  await requireActive(id);
  const tipo = typeof sp.tipo === "string" && OPTIONS.some((o) => o.value === sp.tipo) ? sp.tipo : "reclamo";

  return (
    <div className="mx-auto max-w-xl">
      <Link href={`/c/${id}/reclamos`} className="link text-sm">
        ← Reclamos y sugerencias
      </Link>
      <div className="mt-3">
        <Flash error={typeof sp.error === "string" ? sp.error : undefined} />
      </div>
      <PageTitle>Nuevo caso</PageTitle>
      <form action={createTicket.bind(null, id)} className="card space-y-5">
        <fieldset className="space-y-2">
          <legend className="label">¿Qué quieres enviar?</legend>
          {OPTIONS.map((o) => (
            <label key={o.value} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input type="radio" name="kind" value={o.value} defaultChecked={o.value === tipo} className="mt-1 accent-[var(--accent)]" />
              <span>
                <span className="block font-medium">{o.label}</span>
                <span className="block text-sm text-muted">{o.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Field label="Título">
          <input className="input" name="title" required minLength={3} maxLength={120} placeholder="Ej: Luz del pasillo piso 3 no funciona" />
        </Field>
        <Field label="Descripción">
          <textarea className="input min-h-32" name="body" required maxLength={4000} placeholder="Cuéntanos qué pasa, desde cuándo y dónde." />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="is_public" defaultChecked className="mt-0.5 accent-[var(--accent)]" />
          <span>
            <span className="font-medium">Visible para toda la comunidad</span>
            <span className="block text-muted">Si lo desmarcas, solo lo verá la directiva. Los mensajes a la administración son siempre privados.</span>
          </span>
        </label>
        <SubmitButton className="btn-primary w-full" pendingText="Enviando…">
          Enviar
        </SubmitButton>
      </form>
    </div>
  );
}
