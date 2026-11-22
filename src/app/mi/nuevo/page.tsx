import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, House, Lock } from "lucide-react";
import { getMySpaces } from "@/lib/family";
import { isDayKey } from "@/lib/time";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "Agregar" };

// Elige dónde va la actividad: tu agenda personal o una de tus familias.
export default async function MiNuevo({ searchParams }: PageProps<"/mi/nuevo">) {
  const sp = await searchParams;
  const { spaces, personalId } = await getMySpaces();
  const fecha = isDayKey(sp.fecha) ? `?fecha=${sp.fecha}` : "";
  const families = spaces.filter((s) => !s.isPersonal);
  if (!families.length && personalId) redirect(`/f/${personalId}/nuevo${fecha}`);

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle sub="Elige dónde quieres agregar la actividad.">¿Dónde va?</PageTitle>
      <div className="space-y-3">
        {personalId && (
          <Link href={`/f/${personalId}/nuevo${fecha}`} className="card flex items-center gap-4 transition hover:ring-2 hover:ring-accent/30">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Lock className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl font-semibold">Mi agenda</span>
              <span className="text-sm text-muted">Solo para ti. Nadie más lo ve.</span>
            </span>
            <ChevronRight className="size-5 text-muted" />
          </Link>
        )}
        {families.map((f) => (
          <Link key={f.id} href={`/f/${f.id}/nuevo${fecha}`} className="card flex items-center gap-4 transition hover:ring-2 hover:ring-accent/30">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sun-soft text-sun">
              <House className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-xl font-semibold">{f.name}</span>
              <span className="text-sm text-muted">Con responsable, relevos y balance.</span>
            </span>
            <ChevronRight className="size-5 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
