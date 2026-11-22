import Link from "next/link";
import { getFamily } from "@/lib/family";
import { isDayKey, todayKey } from "@/lib/time";
import { EventForm } from "@/components/event-form";
import { Flash, PageTitle } from "@/components/ui";
import { createEvent } from "../actions";

export const metadata = { title: "Agregar" };

export default async function Nuevo({ params, searchParams }: PageProps<"/f/[id]/nuevo">) {
  const { id } = await params;
  const sp = await searchParams;
  const { members, me, family } = await getFamily(id);
  const fecha = isDayKey(sp.fecha) ? sp.fecha : todayKey();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={family.is_personal ? "/mi" : `/f/${id}`} className="btn-ghost -ml-3 min-h-9 py-1.5">
        ← Volver
      </Link>
      <div className="mt-3">
        <Flash error={typeof sp.error === "string" ? sp.error : undefined} />
      </div>
      <PageTitle>{family.is_personal ? "Agregar a mi agenda" : `Agregar a ${family.name}`}</PageTitle>
      <EventForm action={createEvent.bind(null, id)} members={members}
        personal={family.is_personal} me={me} defaultDate={fecha} submitLabel="Guardar" cancelHref={family.is_personal ? "/mi" : `/f/${id}`} />
    </div>
  );
}
