"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { back, getFamily, text } from "@/lib/family";
import { MEMBER_COLORS } from "@/lib/format";

const KINDS = ["adulto", "nino", "adulto_mayor", "mascota"];
const path = (id: string) => `/f/${id}/familia`;

export async function addMember(familyId: string, formData: FormData) {
  const { supabase } = await getFamily(familyId);
  const name = text(formData, "name").slice(0, 40);
  const kind = text(formData, "kind");
  const color = text(formData, "color");
  if (!name) back(path(familyId), { error: "Escribe un nombre" });
  const { error } = await supabase.from("family_members").insert({
    family_id: familyId,
    name,
    kind: KINDS.includes(kind) ? kind : "adulto",
    color: color in MEMBER_COLORS ? color : "gris",
  });
  revalidatePath(`/f/${familyId}`, "layout");
  back(path(familyId), error ? { error: "No se pudo agregar" } : { ok: `${name} ya es parte de la agenda` });
}

export async function updateMember(familyId: string, memberId: string, formData: FormData) {
  const { supabase, isAdmin } = await getFamily(familyId);
  const name = text(formData, "name").slice(0, 40);
  const kind = text(formData, "kind");
  const color = text(formData, "color");
  const role = text(formData, "role");
  if (!name) back(path(familyId), { error: "El nombre no puede quedar vacío" });
  const patch: Record<string, string | null> = {
    name,
    color: color in MEMBER_COLORS ? color : "gris",
    phone: text(formData, "phone").slice(0, 30) || null,
  };
  if (KINDS.includes(kind)) patch.kind = kind;
  if (isAdmin && (role === "admin" || role === "miembro")) patch.role = role;
  const { error } = await supabase.from("family_members").update(patch).eq("id", memberId).eq("family_id", familyId);
  revalidatePath(`/f/${familyId}`, "layout");
  back(path(familyId), error ? { error: error.message.includes("administrador") ? error.message : "No se pudo guardar" } : { ok: "Cambios guardados" });
}

export async function removeMember(familyId: string, memberId: string) {
  const { supabase } = await getFamily(familyId);
  const { error, count } = await supabase.from("family_members").delete({ count: "exact" }).eq("id", memberId).eq("family_id", familyId);
  revalidatePath(`/f/${familyId}`, "layout");
  back(path(familyId), error || !count ? { error: error?.message.includes("administrador") ? error.message : "No se pudo quitar" } : { ok: "Quitado de la familia" });
}

export async function leaveFamily(familyId: string) {
  const { supabase, me } = await getFamily(familyId);
  const { error } = await supabase.from("family_members").delete().eq("id", me.id);
  if (error) back(path(familyId), { error: error.message.includes("administrador") ? error.message : "No se pudo salir" });
  redirect(`/inicio?lista=1&ok=${encodeURIComponent("Saliste de la familia")}`);
}

export async function renameFamily(familyId: string, formData: FormData) {
  const { supabase } = await getFamily(familyId);
  const name = text(formData, "name").slice(0, 60);
  if (name.length < 2) back(path(familyId), { error: "El nombre es muy corto" });
  const { error } = await supabase.from("families").update({ name }).eq("id", familyId);
  revalidatePath(`/f/${familyId}`, "layout");
  back(path(familyId), error ? { error: "Solo un administrador puede cambiar el nombre" } : { ok: "Nombre actualizado" });
}

export async function rotateCode(familyId: string) {
  const { supabase } = await getFamily(familyId);
  const { error } = await supabase.rpc("rotate_family_code", { fid: familyId });
  back(path(familyId), error ? { error: "Solo un administrador puede hacerlo" } : { ok: "Nuevo enlace creado. El anterior ya no funciona." });
}
