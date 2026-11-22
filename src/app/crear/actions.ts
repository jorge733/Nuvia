"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, text } from "@/lib/family";

const KINDS = ["adulto", "nino", "adulto_mayor", "mascota"];

export async function createFamily(formData: FormData) {
  await requireUser();
  const name = text(formData, "name");
  const myName = text(formData, "my_name");
  if (name.length < 2 || !myName) redirect(`/crear?error=${encodeURIComponent("Completa el nombre de la familia y cómo te llaman")}`);

  const members = Array.from({ length: 6 }, (_, i) => ({
    name: text(formData, `m_name_${i}`).slice(0, 40),
    kind: KINDS.includes(text(formData, `m_kind_${i}`)) ? text(formData, `m_kind_${i}`) : "adulto",
    color: text(formData, `m_color_${i}`) || "gris",
  })).filter((m) => m.name);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_family", {
    p_name: name.slice(0, 60),
    p_my_name: myName.slice(0, 40),
    p_my_color: text(formData, "my_color") || "violeta",
    p_members: members,
  });
  if (error || !data) redirect(`/crear?error=${encodeURIComponent("No se pudo crear la familia. Inténtalo de nuevo.")}`);
  redirect(`/f/${data}?ok=${encodeURIComponent("¡Listo! Esta es la agenda de tu familia.")}&bienvenida=1`);
}
