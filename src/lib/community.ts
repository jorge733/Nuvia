import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Community = {
  id: string;
  name: string;
  kind: string;
  address: string | null;
  comuna: string;
  region: string | null;
  whatsapp_url: string | null;
  sales_whatsapp_url: string | null;
  admin_name: string | null;
  admin_email: string | null;
  admin_phone: string | null;
  invite_code: string;
};

export type Membership = {
  id: string;
  role: "admin" | "comite" | "residente";
  status: "pendiente" | "activo" | "rechazado";
  unit_id: string | null;
  relation: string;
  units: { label: string } | null;
};

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/ingresar");
  return user;
}

// Contexto de una comunidad para el usuario actual. Se cachea por request.
export const getCommunity = cache(async (id: string) => {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: community }, { data: membership }] = await Promise.all([
    supabase.from("communities").select("*").eq("id", id).maybeSingle<Community>(),
    supabase
      .from("memberships")
      .select("id, role, status, unit_id, relation, units(label)")
      .eq("community_id", id)
      .eq("user_id", user.id)
      .maybeSingle<Membership>(),
  ]);

  if (!community || !membership) notFound();

  return {
    supabase,
    user,
    community,
    membership,
    active: membership.status === "activo",
    canManage: membership.status === "activo" && membership.role !== "residente",
    isAdmin: membership.status === "activo" && membership.role === "admin",
  };
});

export async function requireActive(id: string) {
  const ctx = await getCommunity(id);
  if (!ctx.active) redirect(`/c/${id}`);
  return ctx;
}

export async function requireManager(id: string) {
  const ctx = await getCommunity(id);
  if (!ctx.canManage) redirect(`/c/${id}?error=${encodeURIComponent("Solo la directiva puede hacer eso")}`);
  return ctx;
}

export const FILE_BUCKET = "comunidad";

export function safeFileName(name: string) {
  const ext = (name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const base = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .slice(0, 50);
  return `${Date.now()}-${base || "archivo"}${ext ? "." + ext : ""}`;
}

export const MAX_FILE_BYTES = 4 * 1024 * 1024;

export function getFile(formData: FormData, key: string): File | null {
  const f = formData.get(key);
  if (!(f instanceof File) || f.size === 0) return null;
  if (f.size > MAX_FILE_BYTES) throw new Error("El archivo supera los 4 MB");
  return f;
}

export function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function back(path: string, msg: { ok?: string; error?: string }): never {
  const q = msg.error ? `error=${encodeURIComponent(msg.error)}` : `ok=${encodeURIComponent(msg.ok ?? "Listo")}`;
  redirect(`${path}${path.includes("?") ? "&" : "?"}${q}`);
}
