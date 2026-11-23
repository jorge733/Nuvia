// Avisos de relevo por correo:
// - alguien pide relevo → a la familia (menos a quien lo pidió);
// - alguien lo toma → solo a quien lo pidió.
import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { CATEGORIES } from "@/lib/format";
import { capitalize, dayKey, formatDay, relativeDay, timeOf } from "@/lib/time";
import { eventCard, renderEmail, renderText } from "./layout";
import { sendBatch } from "./resend";

export type ReliefNotice = {
  kind: "pedido" | "tomado";
  site: string;
  familyId: string;
  familyName: string;
  eventId: string;
  /** Inicio de esta repetición. */
  occurrence: string;
  title: string;
  category: string;
  location: string | null;
  allDay: boolean;
  /** Duración en minutos (si tiene hora de término). */
  minutes: number | null;
  reason: string | null;
  /** Quien pidió (pedido) o quien tomó (tomado). */
  actorId: string;
  actorName: string;
  /** Solo en "tomado": a quién avisar. */
  requesterMemberId?: string;
};

type Recipient = { email: string; full_name: string; email_token: string };

function when(n: ReliefNotice) {
  const start = new Date(n.occurrence);
  const day = capitalize(formatDay(dayKey(start)));
  if (n.allDay) return `${day} · todo el día`;
  const end = n.minutes ? new Date(start.getTime() + n.minutes * 60000) : null;
  return `${day} · ${timeOf(start)}${end ? `–${timeOf(end)}` : ""}`;
}

/** "hoy 16:00", "mañana", "el jueves 27 de noviembre 9:00": para el asunto. */
function soon(n: ReliefNotice) {
  const start = new Date(n.occurrence);
  const rel = relativeDay(dayKey(start));
  const day = rel === "Hoy" || rel === "Mañana" || rel === "Ayer" ? rel.toLowerCase() : `el ${formatDay(dayKey(start))}`;
  return n.allDay ? day : `${day} ${timeOf(start)}`;
}

export function renderRelief(n: ReliefNotice, to: { name: string; token: string }) {
  const link = `${n.site}/f/${n.familyId}/e/${n.eventId}?o=${encodeURIComponent(n.occurrence)}`;
  const unsubscribe = `${n.site}/api/correo/baja?t=${to.token}&tipo=avisos`;
  const rows = [
    { label: "Cuándo", value: when(n) },
    ...(n.location ? [{ label: "Dónde", value: n.location }] : []),
    ...(n.kind === "pedido" && n.reason ? [{ label: "Motivo", value: n.reason }] : []),
  ];
  const hello = to.name ? `Hola, ${to.name}. ` : "";
  const asked = n.kind === "pedido";
  const content = {
    preheader: asked ? `${n.actorName} necesita que alguien se encargue · ${soon(n)}` : `${n.actorName} se encarga · ${soon(n)}`,
    heading: asked ? "Tu familia necesita una mano" : "¡Ya está cubierto!",
    intro: asked
      ? `${hello}${n.actorName} pidió relevo para “${n.title}” en ${n.familyName}. ¿Puedes encargarte tú?`
      : `${hello}${n.actorName} tomó tu relevo de “${n.title}”. Ya no tienes que preocuparte por eso.`,
    bodyHtml: eventCard({ emoji: CATEGORIES[n.category]?.emoji ?? "📌", title: n.title, rows, tone: asked ? "#f2763a" : "#2fa36b" }),
    button: { label: asked ? "Yo me encargo" : "Ver en Uniluva", url: link },
    footer: `Recibes este aviso porque eres parte de ${n.familyName} en Uniluva.`,
    footerLink: { label: "No recibir estos avisos", url: unsubscribe },
    fallback: false,
  };
  const text = renderText({ ...content, intro: `${content.intro}\n\n${n.title}\n${rows.map((r) => `${r.label}: ${r.value}`).join("\n")}` });
  const subject = asked ? `${n.actorName} necesita relevo: ${n.title} · ${soon(n)}` : `${n.actorName} tomó tu relevo: ${n.title}`;
  return { subject: subject.slice(0, 120), html: renderEmail(content), text, unsubscribe };
}

/** Envía el aviso. No lanza errores: solo los registra. */
export async function notifyRelief(n: ReliefNotice) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || !process.env.RESEND_API_KEY) return;
    const supabase = createClient(supabaseUrl(), supabaseKey(), { auth: { persistSession: false } });
    const { data, error } =
      n.kind === "pedido"
        ? await supabase.rpc("event_notify_recipients", { p_secret: secret, p_event_id: n.eventId, p_actor: n.actorId })
        : await supabase.rpc("member_contact", { p_secret: secret, p_member_id: n.requesterMemberId });
    if (error) throw new Error(error.message);

    await sendBatch(
      ((data ?? []) as Recipient[]).map((r) => {
        const m = renderRelief(n, { name: (r.full_name || "").split(" ")[0] || "", token: r.email_token });
        return {
          to: r.email,
          subject: m.subject,
          html: m.html,
          text: m.text,
          headers: { "List-Unsubscribe": `<${m.unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        };
      }),
    );
  } catch (e) {
    console.error("aviso de relevo:", (e as Error).message);
  }
}
