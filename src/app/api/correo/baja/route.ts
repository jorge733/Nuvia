import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

type Kind = "resumen" | "avisos" | "invitado";

const KINDS: Kind[] = ["resumen", "avisos", "invitado"];
const kindOf = (url: URL): Kind => KINDS.find((k) => k === url.searchParams.get("tipo")) ?? "resumen";
const RPC: Record<Kind, string> = { resumen: "unsubscribe_digest", avisos: "unsubscribe_changes", invitado: "unsubscribe_guest" };

async function unsubscribe(token: string | null, kind: Kind) {
  if (!token || !/^[a-f0-9]{36}$/.test(token)) return false;
  const supabase = createClient(supabaseUrl(), supabaseKey(), { auth: { persistSession: false } });
  const { data } = await supabase.rpc(RPC[kind], { p_token: token });
  return data === true;
}

const DONE: Record<Kind, string> = {
  resumen: "Ya no recibirás el resumen diario.",
  avisos: "Ya no recibirás avisos cuando tu familia agregue o cambie actividades.",
  invitado: "Ya no recibirás avisos de esta actividad.",
};

const page = (ok: boolean, kind: Kind, token: string) => {
  const guest = kind === "invitado";
  const after = guest ? "" : " Puedes cambiarlo cuando quieras desde Mi perfil.";
  const button = guest && ok ? { url: `/invitacion/${token}`, label: "Ver la invitación" } : { url: "/perfil", label: "Ir a Mi perfil" };
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Uniluva</title></head>
<body style="margin:0;background:#faf6f0;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#1f1b16;display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box;">
<div style="max-width:420px;background:#fff;border-radius:24px;padding:32px;text-align:center;">
<h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 12px;">${ok ? "Listo" : "Enlace no válido"}</h1>
<p style="color:#6f675c;line-height:1.6;margin:0 0 20px;">${ok ? `${DONE[kind]}${after}` : `Este enlace no es válido o ya fue usado.${guest ? "" : " Puedes cambiar tus correos desde Mi perfil."}`}</p>
<a href="${button.url}" style="display:inline-block;background:#5b3fd9;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;">${button.label}</a>
</div></body></html>`;
};

// Baja desde el enlace del correo.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ok = await unsubscribe(url.searchParams.get("t"), kindOf(url));
  return new Response(page(ok, kindOf(url), url.searchParams.get("t") ?? ""), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Baja con un clic desde el botón del cliente de correo (List-Unsubscribe-Post).
export async function POST(req: Request) {
  const url = new URL(req.url);
  await unsubscribe(url.searchParams.get("t"), kindOf(url));
  return new Response(null, { status: 200 });
}
