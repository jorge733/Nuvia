"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, text } from "@/lib/family";

export async function joinFamily(formData: FormData) {
  await requireUser();
  const codigo = text(formData, "codigo");
  const memberId = text(formData, "member_id");
  const name = text(formData, "name");
  const backTo = `/unirse?codigo=${encodeURIComponent(codigo)}`;
  if (!memberId && !name) redirect(`${backTo}&error=${encodeURIComponent("Elige quién eres o escribe tu nombre")}`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_family", { p_code: codigo, p_member_id: memberId || null, p_name: name || null });
  if (error || !data) redirect(`${backTo}&error=${encodeURIComponent(error?.message?.includes("disponible") ? "Ese perfil ya fue tomado por otra cuenta" : "No pudimos unirte. Revisa el código.")}`);
  redirect(`/f/${data}?ok=${encodeURIComponent("¡Bienvenido/a a la familia!")}`);
}
