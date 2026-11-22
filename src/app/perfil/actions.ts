"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, text } from "@/lib/community";

export async function saveProfile(formData: FormData) {
  const user = await requireUser();
  const fullName = text(formData, "full_name").slice(0, 80);
  const phone = text(formData, "phone").slice(0, 30) || null;
  if (fullName.length < 2) redirect(`/perfil?error=${encodeURIComponent("Escribe tu nombre")}`);

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
  if (error) redirect(`/perfil?error=${encodeURIComponent("No se pudo guardar")}`);
  if (formData.get("welcome")) redirect("/inicio");
  redirect(`/perfil?ok=${encodeURIComponent("Perfil guardado")}`);
}
