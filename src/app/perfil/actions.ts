"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, text } from "@/lib/family";

export async function saveProfile(formData: FormData) {
  const user = await requireUser();
  const fullName = text(formData, "full_name").slice(0, 80);
  if (fullName.length < 2) redirect(`/perfil?error=${encodeURIComponent("Escribe tu nombre")}`);
  const patch: { full_name: string; phone?: string | null } = { full_name: fullName };
  if (formData.has("phone")) patch.phone = text(formData, "phone").slice(0, 30) || null;

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) redirect(`/perfil?error=${encodeURIComponent("No se pudo guardar")}`);
  if (formData.get("welcome")) redirect("/inicio");
  redirect(`/perfil?ok=${encodeURIComponent("Perfil guardado")}`);
}

export async function createCalendarLink() {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_tokens").insert({ user_id: user.id });
  redirect(`/perfil?${error ? `error=${encodeURIComponent("No se pudo crear el enlace")}` : `ok=${encodeURIComponent("Enlace creado. Ahora agrégalo a tu calendario.")}`}`);
}

export async function renewCalendarLink() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("calendar_tokens").delete().eq("user_id", user.id);
  const { error } = await supabase.from("calendar_tokens").insert({ user_id: user.id });
  redirect(`/perfil?${error ? `error=${encodeURIComponent("No se pudo renovar el enlace")}` : `ok=${encodeURIComponent("Enlace renovado. El anterior ya no funciona.")}`}`);
}

export async function setChangeEmail(on: boolean) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ change_email: on }).eq("id", user.id);
  redirect(`/perfil?${error ? `error=${encodeURIComponent("No se pudo guardar")}` : `ok=${encodeURIComponent(on ? "Avisos de cambios activados" : "Avisos de cambios desactivados")}`}`);
}

export async function setDailyEmail(on: boolean) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ daily_email: on }).eq("id", user.id);
  redirect(`/perfil?${error ? `error=${encodeURIComponent("No se pudo guardar")}` : `ok=${encodeURIComponent(on ? "Resumen diario activado" : "Resumen diario desactivado")}`}`);
}
