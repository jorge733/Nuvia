"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const raw = String(formData.get("siguiente") ?? "/inicio");
  const siguiente = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/inicio";
  const back = `/ingresar?siguiente=${encodeURIComponent(siguiente)}`;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`${back}&error=${encodeURIComponent("Escribe un correo válido")}`);
  }

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm?siguiente=${encodeURIComponent(siguiente)}` },
  });

  if (error) {
    const msg = error.status === 429 ? "Demasiados intentos. Espera un minuto y vuelve a intentarlo." : "No pudimos enviar el correo. Inténtalo de nuevo.";
    redirect(`${back}&error=${encodeURIComponent(msg)}`);
  }

  redirect(`${back}&enviado=${encodeURIComponent(email)}`);
}
