import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Family = { id: string; name: string; invite_code: string };

export type Member = {
  id: string;
  family_id: string;
  user_id: string | null;
  name: string;
  kind: "adulto" | "nino" | "adulto_mayor" | "mascota";
  color: string;
  role: "admin" | "miembro";
  phone: string | null;
};

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

/** Misma verificación que el proxy (evita bucles de redirección si difieren). */
export async function hasSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return !!data?.claims;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/ingresar");
  return user;
}

// Contexto de una familia para el usuario actual (cacheado por request).
export const getFamily = cache(async (id: string) => {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: family }, { data: members }] = await Promise.all([
    supabase.from("families").select("id, name, invite_code").eq("id", id).maybeSingle<Family>(),
    supabase.from("family_members").select("id, family_id, user_id, name, kind, color, role, phone").eq("family_id", id).order("created_at").returns<Member[]>(),
  ]);
  if (!family || !members) notFound();
  const me = members.find((m) => m.user_id === user.id);
  if (!me) notFound();
  const byId = Object.fromEntries(members.map((m) => [m.id, m])) as Record<string, Member>;
  return { supabase, user, family, members, me, byId, isAdmin: me.role === "admin" };
});

export function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function back(path: string, msg: { ok?: string; error?: string }): never {
  const q = msg.error ? `error=${encodeURIComponent(msg.error)}` : `ok=${encodeURIComponent(msg.ok ?? "Listo")}`;
  redirect(`${path}${path.includes("?") ? "&" : "?"}${q}`);
}

/** Solo rutas internas (evita redirecciones abiertas). */
export function safePath(raw: string, fallback: string) {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}
