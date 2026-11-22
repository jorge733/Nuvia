import Link from "next/link";
import { getFamily, getMySpaces } from "@/lib/family";
import { isDayKey, todayKey } from "@/lib/time";
import { EventForm } from "@/components/event-form";
import { Flash, PageTitle } from "@/components/ui";
import { SpaceTabs } from "@/components/space-tabs";
import { createEvent } from "../actions";

export const metadata = { title: "Agregar" };

export default async function Nuevo({ params, searchParams }: PageProps<"/f/[id]/nuevo">) {
  const { id } = await params;
  const sp = await searchParams;
  const [{ members, me, family }, { spaces }] = await Promise.all([getFamily(id), getMySpaces()]);
  const fecha = isDayKey(sp.fecha) ? sp.fecha : todayKey();
  const home = family.is_personal ? "/mi" : `/f/${id}`;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={home} className="btn-ghost -ml-3 min-h-9 py-1.5">
        ← Volver
      </Link>
      <div className="mt-3">
        <Flash error={typeof sp.error === "string" ? sp.error : undefined} />
      </div>
      <PageTitle sub={family.is_personal ? "Solo para ti. Nadie más lo ve." : "Elige quién se encarga. Si no puede, podrá pedir relevo."}>Agregar</PageTitle>
      <SpaceTabs spaces={spaces} current={id} query={isDayKey(sp.fecha) ? `?fecha=${sp.fecha}` : ""} />
      <EventForm action={createEvent.bind(null, id)} members={members} me={me} personal={family.is_personal} defaultDate={fecha} submitLabel="Guardar" cancelHref={home} />
    </div>
  );
}
