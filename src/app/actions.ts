"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, ReactionKind } from "@/lib/types";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}

async function uploadImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: FormDataEntryValue | null,
  folder: string,
): Promise<{ path: string | null; error?: string }> {
  if (!(file instanceof File) || file.size === 0) return { path: null };
  if (!IMAGE_TYPES.includes(file.type)) return { path: null, error: "La imagen debe ser JPG, PNG, WebP o GIF." };
  if (file.size > MAX_IMAGE_BYTES) return { path: null, error: "La imagen no puede pesar más de 5 MB." };
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (error) return { path: null, error: "No pudimos subir la imagen. Intenta de nuevo." };
  return { path };
}

// ─── Autenticación ──────────────────────────────────────────

export async function signIn(_: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: str(form, "email"),
    password: String(form.get("password") ?? ""),
  });
  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Confirma tu correo antes de entrar. Revisa tu bandeja de entrada."
          : "Correo o contraseña incorrectos.",
    };
  }
  revalidatePath("/", "layout");
  redirect(safeNext(str(form, "next")));
}

export async function signUp(_: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, "email");
  const password = String(form.get("password") ?? "");
  const displayName = str(form, "display_name");
  const username = str(form, "username").toLowerCase();

  if (!/^[a-z0-9_]{3,24}$/.test(username))
    return { error: "El usuario debe tener 3 a 24 caracteres: letras, números o guion bajo." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (!form.get("accept")) return { error: "Debes aceptar los términos y las normas de la comunidad." };

  const supabase = await createClient();
  const { data: taken } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return { error: "Ese nombre de usuario ya está en uso." };

  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: displayName || username },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) {
    return {
      error: error.code === "user_already_exists" ? "Ya existe una cuenta con ese correo." : error.message,
    };
  }
  if (!data.session) return { ok: true }; // Debe confirmar el correo.
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/entrar?error=google");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

// ─── Aportes ────────────────────────────────────────────────

export async function createPost(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const body = str(form, "body");
  const link = str(form, "link_url");
  const communityId = str(form, "community_id") || null;

  if (!body) return { error: "Escribe algo para compartir." };
  if (body.length > 5000) return { error: "El aporte no puede superar los 5.000 caracteres." };
  if (link && !/^https?:\/\/\S+$/i.test(link)) return { error: "El enlace debe empezar con http:// o https://" };

  const image = await uploadImage(supabase, user.id, form.get("image"), "posts");
  if (image.error) return { error: image.error };

  const { error } = await supabase.from("posts").insert({
    body,
    link_url: link || null,
    community_id: communityId,
    image_path: image.path,
  });
  if (error) {
    if (image.path) await supabase.storage.from("media").remove([image.path]);
    return { error: communityId ? "Únete a la comunidad para publicar en ella." : "No pudimos publicar. Intenta de nuevo." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePost(postId: string) {
  const { supabase } = await requireUser();
  const { data: post } = await supabase.from("posts").select("image_path").eq("id", postId).single();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (!error && post?.image_path) await supabase.storage.from("media").remove([post.image_path]);
  revalidatePath("/", "layout");
}

export async function toggleReaction(postId: string, kind: ReactionKind, active: boolean) {
  const { supabase, user } = await requireUser();
  if (active) {
    await supabase.from("reactions").delete().match({ post_id: postId, user_id: user.id, kind });
  } else {
    await supabase.from("reactions").insert({ post_id: postId, kind });
  }
  revalidatePath(`/p/${postId}`);
}

// ─── Comentarios ────────────────────────────────────────────

export async function addComment(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const postId = str(form, "post_id");
  const body = str(form, "body");
  if (!body) return { error: "Escribe un comentario." };
  if (body.length > 2000) return { error: "El comentario es demasiado largo." };
  const { error } = await supabase.from("comments").insert({ post_id: postId, body });
  if (error) return { error: "No pudimos comentar. Intenta de nuevo." };
  revalidatePath(`/p/${postId}`);
  return { ok: true };
}

export async function deleteComment(commentId: string, postId: string) {
  const { supabase } = await requireUser();
  await supabase.from("comments").delete().eq("id", commentId);
  revalidatePath(`/p/${postId}`);
}

// ─── Comunidades ────────────────────────────────────────────

export async function createCommunity(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const name = str(form, "name");
  const description = str(form, "description");
  const slug = slugify(str(form, "slug") || name);

  if (name.length < 3 || name.length > 60) return { error: "El nombre debe tener entre 3 y 60 caracteres." };
  if (slug.length < 3) return { error: "Elige un nombre con al menos 3 letras o números." };
  if (description.length > 300) return { error: "La descripción no puede superar los 300 caracteres." };

  const { error } = await supabase
    .from("communities")
    .insert({ name, slug, description: description || null, created_by: user.id });
  if (error) {
    return { error: error.code === "23505" ? "Ya existe una comunidad con esa dirección." : "No pudimos crear la comunidad." };
  }
  revalidatePath("/c");
  redirect(`/c/${slug}`);
}

export async function joinCommunity(communityId: string, slug: string) {
  const { supabase } = await requireUser();
  await supabase.from("community_members").insert({ community_id: communityId });
  revalidatePath(`/c/${slug}`);
  revalidatePath("/c");
}

export async function leaveCommunity(communityId: string, slug: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("community_members").delete().match({ community_id: communityId, user_id: user.id });
  revalidatePath(`/c/${slug}`);
  revalidatePath("/c");
}

// ─── Perfil ─────────────────────────────────────────────────

export async function updateProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const displayName = str(form, "display_name");
  const username = str(form, "username").toLowerCase();
  const bio = str(form, "bio");

  if (!displayName || displayName.length > 60) return { error: "Tu nombre debe tener entre 1 y 60 caracteres." };
  if (!/^[a-z0-9_]{3,24}$/.test(username))
    return { error: "El usuario debe tener 3 a 24 caracteres: letras, números o guion bajo." };
  if (bio.length > 280) return { error: "La biografía no puede superar los 280 caracteres." };

  const avatar = await uploadImage(supabase, user.id, form.get("avatar"), "avatars");
  if (avatar.error) return { error: avatar.error };

  const update: Record<string, string | null> = { display_name: displayName, username, bio: bio || null };
  if (avatar.path) update.avatar_url = avatar.path;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return { error: error.code === "23505" ? "Ese nombre de usuario ya está en uso." : "No pudimos guardar los cambios." };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ─── Notificaciones ─────────────────────────────────────────

export async function markAllNotificationsRead() {
  const { supabase, user } = await requireUser();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  revalidatePath("/", "layout");
}

// ─── Reportes y cuenta ──────────────────────────────────────

export async function reportPost(postId: string, reason: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const text = reason.trim();
  if (text.length < 3) return { error: "Cuéntanos brevemente el motivo." };
  const { error } = await supabase.from("reports").insert({ post_id: postId, reason: text.slice(0, 500) });
  if (error && error.code !== "23505") return { error: "No pudimos enviar el reporte." };
  return { ok: true };
}

export async function deleteAccount() {
  const { supabase, user } = await requireUser();
  // Borra los archivos del usuario antes de eliminar la cuenta.
  for (const folder of ["posts", "avatars"]) {
    const { data: files } = await supabase.storage.from("media").list(`${user.id}/${folder}`, { limit: 1000 });
    if (files?.length) await supabase.storage.from("media").remove(files.map((f) => `${user.id}/${folder}/${f.name}`));
  }
  const { error } = await supabase.rpc("delete_my_account");
  if (error) redirect("/ajustes?error=eliminar");
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/?cuenta=eliminada");
}
