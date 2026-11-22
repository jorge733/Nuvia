import Link from "next/link";
import { notFound } from "next/navigation";
import { getFamily, getMySpaces } from "@/lib/family";
import type { AgendaEvent } from "@/lib/agenda";
import { todayKey } from "@/lib/time";
import { EventForm, type Destination } from "@/components/event-form";
import { Flash, PageTitle } from "@/components/ui";
import { updateEvent } from "../../../actions";

export const metadata = { title: "Editar" };

export default async function Editar({ params, searchParams }: PageProps<"/f/[id]/e/[eventId]/editar">) {
  const { id, eventId } = await params;
  const sp = await searchParams;
  const [{ supabase, members, me, family, user }, { spaces, personalId }] = await Promise.all([getFamily(id), getMySpaces()]);

  const [{ data: ev }, { data: parts }] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).eq("family_id", id).maybeSingle(),
    supabase.from("event_participants").select("member_id").eq("event_id", eventId),
  ]);
  if (!ev) notFound();
  const event = { ...ev, participant_ids: (parts ?? []).map((p) => p.member_id), masked: false } as AgendaEvent;

  // Quien la creó elige "¿Quién lo ve?" igual que al agregar (y así puede cambiarla de lugar).
  let destinations: Destination[] | undefined;
  let defaultDest = "";
  if (event.created_by === user.id) {
    const contexts = await Promise.all(spaces.map((s) => getFamily(s.id)));
    destinations = spaces.map((s, i) => ({ id: s.id, name: s.name, isPersonal: s.isPersonal, members: contexts[i].members, me: contexts[i].me }));
    // Las antiguas "Solo yo" dentro de una familia se proponen en tu agenda personal.
    defaultDest = family.is_personal || event.visibility === "privado" ? `${family.is_personal ? id : personalId}:privado` : `${id}:${event.visibility}`;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/f/${id}/e/${eventId}`} className="btn-ghost -ml-3 min-h-9 py-1.5">
        ← Volver
      </Link>
      <div className="mt-3">
        <Flash error={typeof sp.error === "string" ? sp.error : undefined} />
      </div>
      <PageTitle sub={event.recurrence !== "none" ? "Los cambios se aplican a todas las repeticiones." : undefined}>Editar</PageTitle>
      <EventForm
        action={updateEvent.bind(null, id, eventId)}
        members={members}
        me={me}
        personal={family.is_personal}
        event={event}
        destinations={destinations}
        defaultDest={defaultDest}
        defaultDate={todayKey()}
        submitLabel="Guardar cambios"
        cancelHref={`/f/${id}/e/${eventId}`}
      />
    </div>
  );
}
