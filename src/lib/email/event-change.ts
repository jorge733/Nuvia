// Aviso por correo a la familia cuando alguien agrega o cambia una actividad.
import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { CATEGORIES } from "@/lib/format";
import { capitalize, dayKey, formatDay, RECURRENCE_LABEL, timeOf } from "@/lib/time";
import { esc, renderEmail, renderText } from "./layout";
import { sendBatch } from "./resend";

/** Lo que se muestra de una actividad (con nombres ya resueltos). */
export type EventSnapshot = {
  title: string;
  category: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
  recurrence: string;
  responsible: string | null;
  participants: string[];
};

export type EventChange = {
  kind: "nuevo" | "cambio";
  site: string;
  familyId: string;
  familyName: string;
  eventId: string;
  actorId: string;
  actorName: string;
  event: EventSnapshot;
  before?: EventSnapshot;
};

const SANS = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function when(e: EventSnapshot) {
  const start = new Date(e.starts_at);
  const day = capitalize(formatDay(dayKey(start)));
  if (e.all_day) return `${day} · todo el día`;
  return `${day} · ${timeOf(start)}${e.ends_at ? `–${timeOf(new Date(e.ends_at))}` : ""}`;
}

const repeat = (e: EventSnapshot) => (e.recurrence !== "none" ? RECURRENCE_LABEL[e.recurrence] ?? null : null);
const people = (names: string[]) => (names.length ? [...names].sort().join(", ") : null);

/** Filas "Cuándo / Dónde / …" de la actividad. */
function details(e: EventSnapshot): [string, string][] {
  const rows: [string, string | null][] = [
    ["Cuándo", when(e)],
    ["Se repite", repeat(e)],
    ["Dónde", e.location],
    ["Se encarga", e.responsible],
    ["Para", people(e.participants)],
  ];
  return rows.filter((r): r is [string, string] => !!r[1]);
}

/** Qué cambió entre dos versiones: [campo, antes, ahora]. */
export function diff(a: EventSnapshot, b: EventSnapshot): [string, string, string][] {
  const fields: [string, (e: EventSnapshot) => string | null, string][] = [
    ["Qué", (e) => e.title, ""],
    ["Cuándo", when, ""],
    ["Se repite", (e) => repeat(e), "No se repite"],
    ["Dónde", (e) => e.location, "Sin lugar"],
    ["Se encarga", (e) => e.responsible, "Nadie todavía"],
    ["Para", (e) => people(e.participants), "Nadie en particular"],
    ["Notas", (e) => e.notes, "Sin notas"],
  ];
  const out: [string, string, string][] = [];
  for (const [label, get, empty] of fields) {
    const x = get(a) ?? "";
    const y = get(b) ?? "";
    if (x !== y) out.push([label, x || empty, y || empty]);
  }
  return out;
}

const cell = (label: string, value: string) =>
  `<tr><td valign="top" style="padding:6px 12px 6px 0;width:92px;font-family:${SANS};font-size:13px;color:#8a8278;">${esc(label)}</td>
   <td valign="top" style="padding:6px 0;font-family:${SANS};font-size:14px;color:#1f1b16;">${value}</td></tr>`;

export function renderEventChange(c: EventChange, recipient: { name: string; token: string }) {
  const e = c.event;
  const emoji = CATEGORIES[e.category]?.emoji ?? "📌";
  const changes = c.kind === "cambio" && c.before ? diff(c.before, e) : [];
  const link = `${c.site}/f/${c.familyId}/e/${c.eventId}`;
  const unsubscribe = `${c.site}/api/correo/baja?t=${recipient.token}&tipo=avisos`;

  const rows =
    c.kind === "nuevo"
      ? details(e).map(([k, v]) => cell(k, esc(v)))
      : changes.map(([k, before, after]) =>
          cell(k, `<span style="color:#8a8278;text-decoration:line-through;">${esc(before)}</span><br><strong>${esc(after)}</strong>`),
        );
  // En un cambio, siempre se muestra cuándo es (aunque no haya cambiado).
  if (c.kind === "cambio" && !changes.some(([k]) => k === "Cuándo")) rows.push(cell("Cuándo", esc(when(e))));

  const bodyHtml = `<div style="margin:0 0 24px;padding:18px 20px;background:#faf6f0;border-left:3px solid #f2763a;border-radius:16px;">
      <div style="font-family:${SANS};font-size:17px;font-weight:bold;color:#1f1b16;">${emoji} ${esc(e.title)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">${rows.join("")}</table>
    </div>`;

  const verb = c.kind === "nuevo" ? "agregó" : "cambió";
  const textLines =
    c.kind === "nuevo"
      ? details(e).map(([k, v]) => `${k}: ${v}`)
      : [...changes.map(([k, before, after]) => `${k}: ${after} (antes: ${before})`), ...(changes.some(([k]) => k === "Cuándo") ? [] : [`Cuándo: ${when(e)}`])];

  const content = {
    preheader: `${when(e)} · ${c.familyName}`,
    heading: c.kind === "nuevo" ? "Nueva actividad en la familia" : "Cambió una actividad",
    intro: `${recipient.name ? `Hola, ${recipient.name}. ` : ""}${c.actorName} ${verb} “${e.title}” en ${c.familyName}.`,
    bodyHtml,
    button: { label: "Ver en Uniluva", url: link },
    footer: `Recibes este aviso porque eres parte de ${c.familyName} en Uniluva.`,
    footerLink: { label: "No recibir estos avisos", url: unsubscribe },
    fallback: false,
  };
  const text = renderText({ ...content, intro: `${content.intro}\n\n${e.title}\n${textLines.join("\n")}` });
  return { subject: `${c.actorName} ${verb}: ${e.title}`.slice(0, 120), html: renderEmail(content), text, unsubscribe };
}

/** Envía el aviso a la familia (menos a quien hizo el cambio). No lanza errores: solo los registra. */
export async function notifyEventChange(c: EventChange) {
  try {
    if (c.kind === "cambio" && c.before && !diff(c.before, c.event).length) return;
    const secret = process.env.CRON_SECRET;
    if (!secret || !process.env.RESEND_API_KEY) return;

    const supabase = createClient(supabaseUrl(), supabaseKey(), { auth: { persistSession: false } });
    const { data, error } = await supabase.rpc("event_notify_recipients", { p_secret: secret, p_event_id: c.eventId, p_actor: c.actorId });
    if (error) throw new Error(`event_notify_recipients: ${error.message}`);
    const recipients = (data ?? []) as { email: string; full_name: string; email_token: string }[];

    await sendBatch(
      recipients.map((r) => {
        const m = renderEventChange(c, { name: (r.full_name || "").split(" ")[0] || "", token: r.email_token });
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
    console.error("aviso de actividad:", (e as Error).message);
  }
}
