"use server";

import { revalidatePath } from "next/cache";
import { back, requireManager, text } from "@/lib/community";
import { parseUnitList } from "@/lib/units";

const ADMIN = (id: string, hash = "") => `/c/${id}/admin${hash}`;

export async function rotateCode(communityId: string) {
  const { supabase } = await requireManager(communityId);
  const { error } = await supabase.rpc("rotate_invite_code", { cid: communityId });
  back(ADMIN(communityId), error ? { error: "No se pudo generar un nuevo código" } : { ok: "Nuevo código generado. El anterior ya no funciona." });
}

export async function setMemberStatus(communityId: string, membershipId: string, status: "activo" | "rechazado") {
  const { supabase } = await requireManager(communityId);
  const { error } = await supabase.from("memberships").update({ status }).eq("id", membershipId).eq("community_id", communityId);
  revalidatePath(`/c/${communityId}`, "layout");
  back(ADMIN(communityId), error ? { error: error.message.includes("administrador") ? error.message : "No se pudo actualizar" } : { ok: status === "activo" ? "Vecino aprobado" : "Solicitud rechazada" });
}

export async function updateMember(communityId: string, membershipId: string, formData: FormData) {
  const { supabase, isAdmin } = await requireManager(communityId);
  const patch: Record<string, string | null> = { unit_id: text(formData, "unit_id") || null };
  const role = text(formData, "role");
  if (isAdmin && ["admin", "comite", "residente"].includes(role)) patch.role = role;
  const { error } = await supabase.from("memberships").update(patch).eq("id", membershipId).eq("community_id", communityId);
  back(ADMIN(communityId), error ? { error: error.message.includes("administrador") ? error.message : "No se pudo actualizar" } : { ok: "Vecino actualizado" });
}

export async function removeMember(communityId: string, membershipId: string) {
  const { supabase } = await requireManager(communityId);
  const { error } = await supabase.from("memberships").delete().eq("id", membershipId).eq("community_id", communityId);
  back(ADMIN(communityId), error ? { error: error.message.includes("administrador") ? error.message : "No se pudo quitar" } : { ok: "Vecino quitado de la comunidad" });
}

export async function addUnits(communityId: string, formData: FormData) {
  const { supabase } = await requireManager(communityId);
  const labels = parseUnitList(text(formData, "units"));
  if (!labels.length) back(ADMIN(communityId), { error: "Escribe al menos una unidad" });
  const { error } = await supabase
    .from("units")
    .upsert(labels.map((label) => ({ community_id: communityId, label })), { onConflict: "community_id,label", ignoreDuplicates: true });
  back(ADMIN(communityId), error ? { error: "No se pudieron agregar" } : { ok: `${labels.length} unidad(es) agregada(s)` });
}

export async function updateUnit(communityId: string, unitId: string, formData: FormData) {
  const { supabase } = await requireManager(communityId);
  const shareRaw = text(formData, "share").replace(",", ".");
  const share = shareRaw === "" ? null : Number(shareRaw);
  if (share !== null && (!Number.isFinite(share) || share < 0 || share > 100)) back(ADMIN(communityId), { error: "El prorrateo debe estar entre 0 y 100" });
  const { error } = await supabase.from("units").update({ share }).eq("id", unitId).eq("community_id", communityId);
  back(ADMIN(communityId), error ? { error: "No se pudo actualizar" } : { ok: "Unidad actualizada" });
}

export async function deleteUnit(communityId: string, unitId: string) {
  const { supabase } = await requireManager(communityId);
  const { error } = await supabase.from("units").delete().eq("id", unitId).eq("community_id", communityId);
  back(ADMIN(communityId), error ? { error: "No se pudo eliminar" } : { ok: "Unidad eliminada" });
}

export async function saveSettings(communityId: string, formData: FormData) {
  const { supabase } = await requireManager(communityId);
  const wa = text(formData, "whatsapp_url");
  const sales = text(formData, "sales_whatsapp_url");
  const waOk = (u: string) => !u || /^https:\/\/(chat\.whatsapp\.com|wa\.me)\//.test(u);
  if (!waOk(wa) || !waOk(sales)) back(ADMIN(communityId), { error: "Los enlaces de WhatsApp deben comenzar con https://chat.whatsapp.com/" });
  const name = text(formData, "name");
  const comuna = text(formData, "comuna");
  if (name.length < 2 || comuna.length < 2) back(ADMIN(communityId), { error: "El nombre y la comuna son obligatorios" });

  const { error } = await supabase
    .from("communities")
    .update({
      name,
      comuna,
      address: text(formData, "address") || null,
      whatsapp_url: wa || null,
      sales_whatsapp_url: sales || null,
      admin_name: text(formData, "admin_name") || null,
      admin_email: text(formData, "admin_email") || null,
      admin_phone: text(formData, "admin_phone") || null,
    })
    .eq("id", communityId);
  revalidatePath(`/c/${communityId}`, "layout");
  back(ADMIN(communityId), error ? { error: "No se pudo guardar" } : { ok: "Datos guardados" });
}

export async function postAnnouncement(communityId: string, formData: FormData) {
  const { supabase, user } = await requireManager(communityId);
  const title = text(formData, "title");
  const body = text(formData, "body");
  if (title.length < 2 || !body) back(ADMIN(communityId), { error: "Escribe un título y el aviso" });
  const { error } = await supabase.from("announcements").insert({ community_id: communityId, title: title.slice(0, 120), body: body.slice(0, 4000), created_by: user.id });
  revalidatePath(`/c/${communityId}`, "layout");
  back(ADMIN(communityId), error ? { error: "No se pudo publicar" } : { ok: "Aviso publicado" });
}

export async function deleteAnnouncement(communityId: string, announcementId: string) {
  const { supabase } = await requireManager(communityId);
  const { error } = await supabase.from("announcements").delete().eq("id", announcementId).eq("community_id", communityId);
  revalidatePath(`/c/${communityId}`, "layout");
  back(ADMIN(communityId), error ? { error: "No se pudo eliminar" } : { ok: "Aviso eliminado" });
}
