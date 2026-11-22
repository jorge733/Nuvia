import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Family = { id: string; name: string; invite_code: string; is_personal: boolean };

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
    supabase.from("families").select("id, name, invite_code, is_personal").eq("id", id).maybeSingle<Family>(),
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

export function back(path: string, msg: { ok?: string; error?: string; link?: string }): never {
  let q = msg.error ? `error=${encodeURIComponent(msg.error)}` : `ok=${encodeURIComponent(msg.ok ?? "Listo")}`;
  if (msg.link && !msg.error) q += `&abrir=${encodeURIComponent(msg.link)}`;
  redirect(`${path}${path.includes("?") ? "&" : "?"}${q}`);
}

/** Solo rutas internas (evita redirecciones abiertas). */
export function safePath(raw: string, fallback: string) {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}

export type Space = { id: string; name: string; isPersonal: boolean; myMemberId: string };

type SpaceRow = { id: string; families: { id: string; name: string; is_personal: boolean } | null };

// Todos los espacios del usuario: su agenda personal (se crea si no existe) y sus familias.
export const getMySpaces = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: personalId } = await supabase.rpc("ensure_personal_space");
  const { data } = await supabase
    .from("family_members")
    .select("id, families(id, name, is_personal)")
    .eq("user_id", user.id)
    .order("created_at")
    .returns<SpaceRow[]>();
  const spaces: Space[] = (data ?? [])
    .filter((r) => r.families)
    .map((r) => ({ id: r.families!.id, name: r.families!.name, isPersonal: r.families!.is_personal, myMemberId: r.id }))
    .sort((a, b) => Number(b.isPersonal) - Number(a.isPersonal));
  return { supabase, user, spaces, personalId: (personalId as string | null) ?? spaces.find((s) => s.isPersonal)?.id ?? null };
});
