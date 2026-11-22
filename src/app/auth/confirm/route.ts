import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Recibe el enlace del correo. Soporta el flujo PKCE (?code=) y el de token_hash.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const raw = searchParams.get("siguiente") ?? "/inicio";
  const siguiente = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/inicio";
  const supabase = await createClient();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  if (ok) return NextResponse.redirect(new URL(siguiente, origin));
  const msg = "El enlace expiró o ya fue usado. Pide uno nuevo.";
  return NextResponse.redirect(new URL(`/ingresar?siguiente=${encodeURIComponent(siguiente)}&error=${encodeURIComponent(msg)}`, origin));
}
