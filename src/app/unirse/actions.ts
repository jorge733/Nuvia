"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { text } from "@/lib/community";

export async function joinCommunity(formData: FormData) {
  const codigo = text(formData, "codigo");
  const relation = text(formData, "relation");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_community", {
    p_code: codigo,
    p_unit_id: text(formData, "unit_id") || null,
    p_unit_label: text(formData, "unit_label") || null,
    p_relation: ["propietario", "arrendatario", "otro"].includes(relation) ? relation : "propietario",
  });
  if (error || !data) {
    redirect(`/unirse?codigo=${encodeURIComponent(codigo)}&error=${encodeURIComponent("No pudimos enviar tu solicitud.")}`);
  }
  redirect(`/c/${data}`);
}
