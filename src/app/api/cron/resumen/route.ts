import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { addDays, startOfDay, todayKey } from "@/lib/time";
import { buildDigests, renderDigest, type DigestRow } from "@/lib/email/digest";
import { sendEmail } from "@/lib/email/resend";

export const maxDuration = 60;

// Resumen diario "Tu día en Uniluva". Lo llama Vercel Cron cada mañana (ver vercel.json).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const today = todayKey();
  const supabase = createClient(supabaseUrl(), supabaseKey(), { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("digest_feed", {
    p_secret: secret,
    p_from: startOfDay(today).toISOString(),
    p_to: startOfDay(addDays(today, 2)).toISOString(),
  });
  if (error) {
    console.error("resumen: digest_feed", error.message);
    return Response.json({ error: "No se pudieron leer los datos" }, { status: 500 });
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.uniluva.com").replace(/\/$/, "");
  const digests = buildDigests((data as DigestRow[]) ?? [], today);
  let sent = 0;
  const failed: string[] = [];
  for (const d of digests) {
    const m = renderDigest(d, today, site);
    try {
      await sendEmail({
        to: d.to,
        subject: m.subject,
        html: m.html,
        text: m.text,
        headers: { "List-Unsubscribe": `<${m.unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      sent++;
    } catch (e) {
      failed.push((e as Error).message.slice(0, 120));
    }
  }
  if (failed.length) console.error("resumen: fallidos", failed);
  return Response.json({ fecha: today, personas: digests.length, enviados: sent, fallidos: failed.length });
}
