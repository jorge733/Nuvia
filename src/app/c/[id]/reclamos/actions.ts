"use server";

import { revalidatePath } from "next/cache";
import { back, requireActive, requireManager, text } from "@/lib/community";

const KINDS = ["reclamo", "sugerencia", "consulta_admin"];
const STATUSES = ["abierto", "en_revision", "resuelto", "cerrado"];

export async function createTicket(communityId: string, formData: FormData) {
  const { supabase, user } = await requireActive(communityId);
  const kind = text(formData, "kind");
  const title = text(formData, "title");
  const body = text(formData, "body");
  const back_ = `/c/${communityId}/reclamos/nuevo?tipo=${kind}`;
  if (!KINDS.includes(kind)) back(back_, { error: "Tipo no válido" });
  if (title.length < 3 || body.length < 1) back(back_, { error: "Escribe un título y una descripción" });
  const isPublic = kind !== "consulta_admin" && formData.get("is_public") === "on";

  const { data, error } = await supabase
    .from("tickets")
    .insert({ community_id: communityId, author_id: user.id, kind, title: title.slice(0, 120), body: body.slice(0, 4000), is_public: isPublic })
    .select("id")
    .single();
  if (error || !data) back(back_, { error: "No se pudo enviar" });
  revalidatePath(`/c/${communityId}`, "layout");
  back(`/c/${communityId}/reclamos/${data.id}`, { ok: kind === "consulta_admin" ? "Mensaje enviado a la administración" : "Enviado. Te avisaremos los avances aquí." });
}

export async function addComment(communityId: string, ticketId: string, formData: FormData) {
  const { supabase, user } = await requireActive(communityId);
  const body = text(formData, "body");
  const path = `/c/${communityId}/reclamos/${ticketId}`;
  if (!body) back(path, { error: "Escribe un comentario" });
  const { error } = await supabase.from("ticket_comments").insert({ ticket_id: ticketId, author_id: user.id, body: body.slice(0, 2000) });
  back(path, error ? { error: "No se pudo comentar" } : { ok: "Comentario agregado" });
}

export async function toggleVote(communityId: string, ticketId: string, voted: boolean, from: string) {
  const { supabase, user } = await requireActive(communityId);
  const { error } = voted
    ? await supabase.from("ticket_votes").delete().eq("ticket_id", ticketId).eq("user_id", user.id)
    : await supabase.from("ticket_votes").insert({ ticket_id: ticketId, user_id: user.id });
  const path = from === "detalle" ? `/c/${communityId}/reclamos/${ticketId}` : `/c/${communityId}/reclamos`;
  back(path, error ? { error: "No se pudo registrar tu apoyo" } : { ok: voted ? "Quitaste tu apoyo" : "¡Apoyo registrado!" });
}

export async function setTicketStatus(communityId: string, ticketId: string, formData: FormData) {
  const { supabase, user } = await requireManager(communityId);
  const status = text(formData, "status");
  const note = text(formData, "note");
  const path = `/c/${communityId}/reclamos/${ticketId}`;
  if (!STATUSES.includes(status)) back(path, { error: "Estado no válido" });
  const { error } = await supabase.from("tickets").update({ status }).eq("id", ticketId).eq("community_id", communityId);
  if (!error && note) await supabase.from("ticket_comments").insert({ ticket_id: ticketId, author_id: user.id, body: note.slice(0, 2000) });
  revalidatePath(`/c/${communityId}`, "layout");
  back(path, error ? { error: "No se pudo actualizar" } : { ok: "Estado actualizado" });
}

export async function deleteTicket(communityId: string, ticketId: string) {
  const { supabase } = await requireActive(communityId);
  const { error, count } = await supabase.from("tickets").delete({ count: "exact" }).eq("id", ticketId).eq("community_id", communityId);
  revalidatePath(`/c/${communityId}`, "layout");
  back(`/c/${communityId}/reclamos`, error || !count ? { error: "No se pudo eliminar" } : { ok: "Eliminado" });
}
