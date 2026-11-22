"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseUnitList } from "@/lib/units";
import { text } from "@/lib/community";

export async function createCommunity(formData: FormData) {
  const name = text(formData, "name");
  const comuna = text(formData, "comuna");
  const kind = text(formData, "kind");
  if (name.length < 2 || comuna.length < 2) redirect(`/crear?error=${encodeURIComponent("Completa el nombre y la comuna")}`);
  if (!["edificio", "condominio", "pasaje", "vecindario"].includes(kind)) redirect("/crear?error=Tipo%20no%20v%C3%A1lido");

  const units = parseUnitList(text(formData, "units"));
  if (units.length > 2000) redirect(`/crear?error=${encodeURIComponent("Máximo 2.000 unidades")}`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_community", {
    p_name: name,
    p_kind: kind,
    p_comuna: comuna,
    p_address: text(formData, "address") || null,
    p_region: text(formData, "region") || null,
    p_unit_labels: units,
    p_my_unit: text(formData, "my_unit") || null,
  });

  if (error || !data) redirect(`/crear?error=${encodeURIComponent("No se pudo crear la comunidad. Revisa los datos.")}`);
  redirect(`/c/${data}/admin?ok=${encodeURIComponent("¡Comunidad creada! Ahora invita a tus vecinos.")}`);
}
