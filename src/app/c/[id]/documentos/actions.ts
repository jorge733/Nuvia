"use server";

import { unstable_rethrow } from "next/navigation";
import { back, FILE_BUCKET, getFile, requireManager, text } from "@/lib/community";
import { uploadFile } from "@/lib/files";

const CATEGORIES = ["reglamento", "actas", "presupuestos", "contratos", "seguros", "otros"];

export async function uploadDocument(communityId: string, formData: FormData) {
  const { supabase, user } = await requireManager(communityId);
  const path = `/c/${communityId}/documentos`;
  const title = text(formData, "title");
  const category = text(formData, "category");
  if (title.length < 2 || !CATEGORIES.includes(category)) back(path, { error: "Indica un título y una categoría" });

  let filePath = "";
  try {
    const file = getFile(formData, "file");
    if (!file) back(path, { error: "Elige un archivo" });
    filePath = await uploadFile(supabase, `${communityId}/documentos`, file);
  } catch (e) {
    unstable_rethrow(e);
    back(path, { error: (e as Error).message });
  }

  const { error } = await supabase.from("documents").insert({ community_id: communityId, title, category, file_path: filePath, uploaded_by: user.id });
  if (error) {
    await supabase.storage.from(FILE_BUCKET).remove([filePath]);
    back(path, { error: "No se pudo guardar el documento" });
  }
  back(path, { ok: "Documento publicado" });
}

export async function deleteDocument(communityId: string, documentId: string) {
  const { supabase } = await requireManager(communityId);
  const { data } = await supabase.from("documents").delete().eq("id", documentId).eq("community_id", communityId).select("file_path").maybeSingle();
  if (data?.file_path) await supabase.storage.from(FILE_BUCKET).remove([data.file_path]);
  back(`/c/${communityId}/documentos`, data ? { ok: "Documento eliminado" } : { error: "No se pudo eliminar" });
}
