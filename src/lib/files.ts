import type { SupabaseClient } from "@supabase/supabase-js";
import { FILE_BUCKET, safeFileName } from "./community";

// URLs firmadas (10 minutos) para un conjunto de rutas del bucket privado.
export async function signedUrls(supabase: SupabaseClient, paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  if (!unique.length) return {} as Record<string, string>;
  const { data } = await supabase.storage.from(FILE_BUCKET).createSignedUrls(unique, 600);
  const out: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}

export async function uploadFile(supabase: SupabaseClient, folder: string, file: File) {
  const path = `${folder}/${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(FILE_BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error("No se pudo subir el archivo");
  return path;
}

// Nombres de perfiles visibles para el usuario actual (RLS: vecinos de sus comunidades).
export async function profileNames(supabase: SupabaseClient, ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return {} as Record<string, string>;
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", unique);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name || "Vecino/a"])) as Record<string, string>;
}
