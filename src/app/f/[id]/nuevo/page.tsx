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
  const { members, me } = await getFamily(id);
  const fecha = isDayKey(sp.fecha) ? sp.fecha : todayKey();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/f/${id}`} className="btn-ghost -ml-3 min-h-9 py-1.5">
        ← Volver
      </Link>
      <div className="mt-3">
        <Flash error={typeof sp.error === "string" ? sp.error : undefined} />
      </div>
      <PageTitle>Agregar a la agenda</PageTitle>
      <EventForm action={createEvent.bind(null, id)} members={members} me={me} defaultDate={fecha} submitLabel="Guardar" cancelHref={`/f/${id}`} />
    </div>
  );
}
