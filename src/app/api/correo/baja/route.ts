import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

async function unsubscribe(token: string | null) {
  if (!token || !/^[a-f0-9]{36}$/.test(token)) return false;
  const supabase = createClient(supabaseUrl(), supabaseKey(), { auth: { persistSession: false } });
  const { data } = await supabase.rpc("unsubscribe_digest", { p_token: token });
  return data === true;
}

const page = (ok: boolean) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Uniluva</title></head>
<body style="margin:0;background:#faf6f0;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#1f1b16;display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box;">
<div style="max-width:420px;background:#fff;border-radius:24px;padding:32px;text-align:center;">
<h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 12px;">${ok ? "Listo" : "Enlace no válido"}</h1>
<p style="color:#6f675c;line-height:1.6;margin:0 0 20px;">${ok ? "Ya no recibirás el resumen diario. Puedes volver a activarlo cuando quieras desde Mi perfil." : "Este enlace no es válido o ya fue usado. Puedes cambiar tus correos desde Mi perfil."}</p>
<a href="/perfil" style="display:inline-block;background:#5b3fd9;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;">Ir a Mi perfil</a>
</div></body></html>`;

// Baja desde el enlace del correo.
export async function GET(req: Request) {
  const ok = await unsubscribe(new URL(req.url).searchParams.get("t"));
  return new Response(page(ok), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Baja con un clic desde el botón del cliente de correo (List-Unsubscribe-Post).
export async function POST(req: Request) {
  await unsubscribe(new URL(req.url).searchParams.get("t"));
  return new Response(null, { status: 200 });
}
