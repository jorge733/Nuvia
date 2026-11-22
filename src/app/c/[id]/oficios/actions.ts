"use server";

import { back, requireActive, text } from "@/lib/community";

function rating(formData: FormData) {
  const r = Number(text(formData, "rating"));
  return Number.isInteger(r) && r >= 1 && r <= 5 ? r : null;
}

export async function addTradesperson(communityId: string, formData: FormData) {
  const { supabase, user, community } = await requireActive(communityId);
  const path = `/c/${communityId}/oficios`;
  const name = text(formData, "name");
  const category = text(formData, "category");
  const phone = text(formData, "phone").replace(/[^\d+ ]/g, "");
  const r = rating(formData);
  if (name.length < 2 || !category || !/^\+?[0-9 ]{8,16}$/.test(phone) || !r) back(path, { error: "Completa nombre, oficio, un teléfono válido y tu evaluación" });
  if (formData.get("consent") !== "on") back(path, { error: "Confirma que la persona autorizó compartir su contacto" });

  const { data: tp, error } = await supabase
    .from("tradespeople")
    .insert({
      name: name.slice(0, 80),
      category,
      phone,
      comuna: community.comuna,
      description: text(formData, "description").slice(0, 500) || null,
      consent_confirmed: true,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !tp) back(path, { error: "No se pudo agregar" });

  const { error: recErr } = await supabase
    .from("trade_recommendations")
    .insert({ tradesperson_id: tp.id, community_id: communityId, user_id: user.id, rating: r, comment: text(formData, "comment").slice(0, 500) || null });
  back(path, recErr ? { error: "Se agregó, pero no se pudo guardar tu recomendación" } : { ok: `¡Gracias! ${name} ahora es visible para tus vecinos.` });
}

export async function recommend(communityId: string, tradespersonId: string, formData: FormData) {
  const { supabase, user } = await requireActive(communityId);
  const path = `/c/${communityId}/oficios`;
  const r = rating(formData);
  if (!r) back(path, { error: "Elige una evaluación de 1 a 5" });
  const { error } = await supabase.from("trade_recommendations").upsert(
    { tradesperson_id: tradespersonId, community_id: communityId, user_id: user.id, rating: r, comment: text(formData, "comment").slice(0, 500) || null },
    { onConflict: "tradesperson_id,user_id" },
  );
  back(path, error ? { error: "No se pudo guardar tu recomendación" } : { ok: "Recomendación guardada" });
}

export async function removeRecommendation(communityId: string, tradespersonId: string) {
  const { supabase, user } = await requireActive(communityId);
  const { error } = await supabase.from("trade_recommendations").delete().eq("tradesperson_id", tradespersonId).eq("user_id", user.id);
  back(`/c/${communityId}/oficios`, error ? { error: "No se pudo quitar" } : { ok: "Recomendación quitada" });
}
