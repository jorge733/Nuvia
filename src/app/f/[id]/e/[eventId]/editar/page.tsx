import Link from "next/link";
import { notFound } from "next/navigation";
import { getFamily } from "@/lib/family";
import type { AgendaEvent } from "@/lib/agenda";
import { todayKey } from "@/lib/time";
import { EventForm } from "@/components/event-form";
import { Flash, PageTitle } from "@/components/ui";
import { updateEvent } from "../../../actions";

export const metadata = { title: "Editar" };

export default async function Editar({ params, searchParams }: PageProps<"/f/[id]/e/[eventId]/editar">) {
  const { id, eventId } = await params;
  const sp = await searchParams;
  const { supabase, members, me, family } = await getFamily(id);

  const [{ data: ev }, { data: parts }] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).eq("family_id", id).maybeSingle(),
    supabase.from("event_participants").select("member_id").eq("event_id", eventId),
  ]);
  if (!ev) notFound();
  const event = { ...ev, participant_ids: (parts ?? []).map((p) => p.member_id), masked: false } as AgendaEvent;

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
        defaultDate={todayKey()}
        submitLabel="Guardar cambios"
        cancelHref={`/f/${id}/e/${eventId}`}
      />
    </div>
  );
}
