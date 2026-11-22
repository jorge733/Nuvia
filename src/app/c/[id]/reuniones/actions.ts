"use server";

import { unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { back, getFile, requireActive, requireManager, text } from "@/lib/community";
import { uploadFile } from "@/lib/files";

// Convierte "2026-12-04T19:00" (hora de Chile) a ISO con zona horaria.
function santiagoToIso(local: string) {
  const asUtc = new Date(local + ":00Z");
  const offsetName = new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", timeZoneName: "longOffset" })
    .formatToParts(asUtc)
    .find((p) => p.type === "timeZoneName")?.value; // "GMT-03:00"
  const m = offsetName?.match(/GMT([+-])(\d{2}):(\d{2})/);
  const offsetMin = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : -180;
  return new Date(asUtc.getTime() - offsetMin * 60000).toISOString();
}

export async function createMeeting(communityId: string, formData: FormData) {
  const { supabase, user } = await requireManager(communityId);
  const path = `/c/${communityId}/reuniones`;
  const title = text(formData, "title");
  const startsAt = text(formData, "starts_at");
  const onlineUrl = text(formData, "online_url");
  if (title.length < 2 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startsAt)) back(path, { error: "Indica el título, la fecha y la hora" });
  if (onlineUrl && !onlineUrl.startsWith("https://")) back(path, { error: "El enlace de videollamada debe comenzar con https://" });

  const { error } = await supabase.from("meetings").insert({
    community_id: communityId,
    title,
    starts_at: santiagoToIso(startsAt),
    location: text(formData, "location") || null,
    online_url: onlineUrl || null,
    agenda: text(formData, "agenda") || null,
    created_by: user.id,
  });
  revalidatePath(`/c/${communityId}`, "layout");
  back(path, error ? { error: "No se pudo agendar la reunión" } : { ok: "Reunión agendada" });
}

export async function rsvp(communityId: string, meetingId: string, attending: boolean) {
  const { supabase, user } = await requireActive(communityId);
  const { error } = await supabase
    .from("meeting_rsvps")
    .upsert({ meeting_id: meetingId, user_id: user.id, attending, updated_at: new Date().toISOString() });
  back(`/c/${communityId}/reuniones`, error ? { error: "No se pudo guardar tu respuesta" } : { ok: attending ? "¡Te esperamos!" : "Gracias por avisar" });
}

export async function uploadMinutes(communityId: string, meetingId: string, formData: FormData) {
  const { supabase } = await requireManager(communityId);
  const path = `/c/${communityId}/reuniones`;
  let minutes = "";
  try {
    const file = getFile(formData, "minutes");
    if (!file) back(path, { error: "Elige el archivo del acta" });
    minutes = await uploadFile(supabase, `${communityId}/actas`, file);
  } catch (e) {
    unstable_rethrow(e);
    back(path, { error: (e as Error).message });
  }
  const { error } = await supabase.from("meetings").update({ minutes_path: minutes }).eq("id", meetingId).eq("community_id", communityId);
  back(path, error ? { error: "No se pudo guardar el acta" } : { ok: "Acta publicada" });
}

export async function deleteMeeting(communityId: string, meetingId: string) {
  const { supabase } = await requireManager(communityId);
  const { error } = await supabase.from("meetings").delete().eq("id", meetingId).eq("community_id", communityId);
  revalidatePath(`/c/${communityId}`, "layout");
  back(`/c/${communityId}/reuniones`, error ? { error: "No se pudo eliminar" } : { ok: "Reunión eliminada" });
}
