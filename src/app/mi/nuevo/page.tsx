import Link from "next/link";
import { redirect } from "next/navigation";
import { getFamily, getMySpaces } from "@/lib/family";
import { isDayKey, todayKey } from "@/lib/time";
import { EventForm, type Destination } from "@/components/event-form";
import { Flash, PageTitle } from "@/components/ui";
import { createEvent } from "@/app/f/[id]/actions";

export const metadata = { title: "Agregar" };

// Un solo formulario para todo: "¿Quién lo ve?" decide si va a tu agenda personal o a una familia.
// ?para=<id> marca de antemano un espacio (al agregar desde una familia o desde el calendario).
export default async function MiNuevo({ searchParams }: PageProps<"/mi/nuevo">) {
  const sp = await searchParams;
  const { spaces, personalId } = await getMySpaces();
  if (!spaces.length) redirect("/crear");

  const contexts = await Promise.all(spaces.map((s) => getFamily(s.id)));
  const destinations: Destination[] = spaces.map((s, i) => ({ id: s.id, name: s.name, isPersonal: s.isPersonal, members: contexts[i].members, me: contexts[i].me }));

  const para = typeof sp.para === "string" ? spaces.find((s) => s.id === sp.para) : undefined;
  const target = para ?? spaces.find((s) => s.id === personalId) ?? spaces[0];
  const defaultDest = `${target.id}:${target.isPersonal ? "privado" : "familia"}`;
  const home = target.isPersonal ? "/mi" : `/f/${target.id}`;
  const fecha = isDayKey(sp.fecha) ? sp.fecha : todayKey();
  const hora = typeof sp.hora === "string" && /^\d{2}:\d{2}$/.test(sp.hora) ? sp.hora : undefined;
  const hasFamily = spaces.some((s) => !s.isPersonal);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={home} className="btn-ghost -ml-3 min-h-9 py-1.5">
        ← Volver
      </Link>
      <div className="mt-3">
        <Flash error={typeof sp.error === "string" ? sp.error : undefined} />
      </div>
      <PageTitle sub={hasFamily ? "Elige quién lo ve. Si es para la familia, elige también quién se encarga." : "Solo para ti. Cuando sumes a tu familia, podrás compartir lo que quieras."}>
        Agregar
      </PageTitle>
      <EventForm action={createEvent} destinations={destinations} defaultDest={defaultDest} defaultDate={fecha} defaultTime={hora} submitLabel="Guardar" cancelHref={home} />
    </div>
  );
}
