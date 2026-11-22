import { authEmail } from "@/lib/email/auth-emails";
import { sendEmail } from "@/lib/email/resend";
import { verifyWebhook } from "@/lib/email/webhook";
import { supabaseUrl } from "@/lib/supabase/env";

type HookPayload = {
  user: { email: string; new_email?: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

const fail = (status: number, message: string) => Response.json({ error: { http_code: status, message } }, { status });

// "Send Email Hook" de Supabase: Supabase nos avisa y Uniluva envía el correo con su propia plantilla.
export async function POST(req: Request) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secret) return fail(500, "Falta SEND_EMAIL_HOOK_SECRET");

  const body = await req.text();
  if (!verifyWebhook(body, req.headers, secret)) return fail(401, "Firma no válida");

  let payload: HookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return fail(400, "JSON no válido");
  }
  const { user, email_data: d } = payload;
  if (!user?.email || !d?.email_action_type) return fail(400, "Datos incompletos");

  // Mismo enlace que {{ .ConfirmationURL }}: pasa por Supabase y vuelve a /auth/confirm.
  const verify = (hash: string) =>
    `${supabaseUrl()}/auth/v1/verify?token=${encodeURIComponent(hash)}&type=${encodeURIComponent(d.email_action_type)}&redirect_to=${encodeURIComponent(d.redirect_to || d.site_url)}`;

  try {
    if (d.email_action_type === "email_change" && d.token_hash_new && user.new_email) {
      const m = authEmail("email_change", verify(d.token_hash_new), user.new_email);
      await sendEmail({ to: user.new_email, ...m });
      const current = authEmail("email_change", verify(d.token_hash), user.email);
      await sendEmail({ to: user.email, ...current });
    } else {
      const m = authEmail(d.email_action_type, verify(d.token_hash), user.email, d.token);
      await sendEmail({ to: user.email, ...m });
    }
  } catch (e) {
    console.error("send-email-hook", (e as Error).message);
    return fail(500, "No se pudo enviar el correo");
  }
  return Response.json({});
}
