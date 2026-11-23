// Avisos por correo cuando alguien agrega, cambia o cancela una actividad:
// a la familia (agregar / cambiar) y a los invitados por correo (invitación / cambio / cancelación).
import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { CATEGORIES } from "@/lib/format";
import { capitalize, dayKey, formatDay, RECURRENCE_LABEL, timeOf } from "@/lib/time";
import { eventCard, renderEmail, renderText } from "./layout";
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
  /** Correos de los invitados. */
  guests: string[];
};

export type Guest = { email: string; token: string };

type Kind = "nuevo" | "cambio" | "cancelado";
type Audience = "familia" | "invitado";

export type EventChange = {
  kind: Kind;
  site: string;
  familyId: string;
  /** null en la agenda personal ("Solo yo"). */
  familyName: string | null;
  eventId: string;
  actorId: string;
  actorEmail: string | null;
  actorName: string;
  event: EventSnapshot;
  before?: EventSnapshot;
  /** Avisar también a la familia (solo actividades que la familia ve con detalle). */
  family: boolean;
  /** Invitados que ya estaban (reciben el cambio o la cancelación). */
  guests: Guest[];
  /** Invitados recién agregados (reciben la invitación). */
  newGuests?: Guest[];
};

export function when(e: EventSnapshot) {
  const start = new Date(e.starts_at);
  const day = capitalize(formatDay(dayKey(start)));
  if (e.all_day) return `${day} · todo el día`;
  return `${day} · ${timeOf(start)}${e.ends_at ? `–${timeOf(new Date(e.ends_at))}` : ""}`;
}

const repeat = (e: EventSnapshot) => (e.recurrence !== "none" ? RECURRENCE_LABEL[e.recurrence] ?? null : null);
const list = (items: string[]) => (items.length ? [...items].sort().join(", ") : null);

// Campos que ve cada público. Los invitados no ven la organización interna de la familia.
type Field = [label: string, get: (e: EventSnapshot) => string | null, empty: string, audiences: Audience[]];
const FIELDS: Field[] = [
  ["Qué", (e) => e.title, "", ["familia", "invitado"]],
  ["Cuándo", when, "", ["familia", "invitado"]],
  ["Se repite", repeat, "No se repite", ["familia", "invitado"]],
  ["Dónde", (e) => e.location, "Sin lugar", ["familia", "invitado"]],
  ["Se encarga", (e) => e.responsible, "Nadie todavía", ["familia"]],
  ["Para", (e) => list(e.participants), "Nadie en particular", ["familia"]],
  ["Invitados", (e) => list(e.guests), "Nadie", ["familia"]],
  ["Notas", (e) => e.notes, "Sin notas", ["familia", "invitado"]],
];

/** Filas "Cuándo / Dónde / …" de una actividad nueva. */
function details(e: EventSnapshot, audience: Audience): [string, string][] {
  // En la invitación también van las notas (el formulario avisa que les llegan); a la familia, solo lo principal.
  const skip = audience === "familia" ? ["Qué", "Notas"] : ["Qué"];
  return FIELDS.filter(([label, , , aud]) => aud.includes(audience) && !skip.includes(label))
    .map(([label, get]) => [label, get(e)] as [string, string | null])
    .filter((r): r is [string, string] => !!r[1]);
}

/** Qué cambió entre dos versiones, para ese público: [campo, antes, ahora]. */
export function diff(a: EventSnapshot, b: EventSnapshot, audience: Audience = "familia"): [string, string, string][] {
  const out: [string, string, string][] = [];
  for (const [label, get, empty, aud] of FIELDS) {
    if (!aud.includes(audience)) continue;
    const x = get(a) ?? "";
    const y = get(b) ?? "";
    if (x !== y) out.push([label, x || empty, y || empty]);
  }
  return out;
}

export function renderEventChange(c: EventChange, kind: Kind, to: { audience: Audience; name: string; token: string }) {
  const e = c.event;
  const guest = to.audience === "invitado";
  const emoji = CATEGORIES[e.category]?.emoji ?? "📌";
  const changes = kind === "cambio" && c.before ? diff(c.before, e, to.audience) : [];
  const link = guest ? `${c.site}/invitacion/${to.token}` : `${c.site}/f/${c.familyId}/e/${c.eventId}`;
  const unsubscribe = `${c.site}/api/correo/baja?t=${to.token}&tipo=${guest ? "invitado" : "avisos"}`;

  let rows: [string, string, string?][];
  if (kind === "cambio") {
    rows = changes.map(([k, before, after]) => [k, after, before]);
    // Siempre se muestra cuándo es (aunque no haya cambiado).
    if (!changes.some(([k]) => k === "Cuándo")) rows.push(["Cuándo", when(e)]);
  } else if (kind === "cancelado") {
    rows = [["Era", when(e)]];
  } else {
    rows = details(e, to.audience);
  }

  const cancelled = kind === "cancelado";
  const bodyHtml = eventCard({ emoji, title: e.title, crossed: cancelled, rows: rows.map(([label, value, before]) => ({ label, value, before })) });
  const textRows = rows.map(([k, now, before]) => `${k}: ${now}${before !== undefined ? ` (antes: ${before})` : ""}`);

  const hello = to.name ? `Hola, ${to.name}. ` : "Hola. ";
  const where = c.familyName ? ` en ${c.familyName}` : "";
  const verb = { nuevo: guest ? "te invitó a" : "agregó", cambio: "cambió", cancelado: "canceló" }[kind];
  const heading = guest
    ? { nuevo: "Te invitaron a una actividad", cambio: "Cambió una actividad", cancelado: "Se canceló una actividad" }[kind]
    : { nuevo: "Nueva actividad en la familia", cambio: "Cambió una actividad", cancelado: "Se canceló una actividad" }[kind];

  const content = {
    preheader: `${when(e)}${c.familyName ? ` · ${c.familyName}` : ""}`,
    heading,
    intro: `${hello}${c.actorName} ${verb} “${e.title}”${guest ? "" : where}.`,
    bodyHtml,
    button: cancelled ? undefined : { label: guest ? "Ver la invitación" : "Ver en Uniluva", url: link },
    note: guest && kind === "nuevo" ? "Desde la invitación puedes agregarla a tu calendario. No necesitas cuenta." : undefined,
    footer: guest
      ? `Recibes este correo porque ${c.actorName} te invitó a esta actividad en Uniluva.`
      : `Recibes este aviso porque eres parte de ${c.familyName} en Uniluva.`,
    footerLink: { label: guest ? "No recibir más avisos de esta actividad" : "No recibir estos avisos", url: unsubscribe },
    fallback: false,
  };
  const text = renderText({ ...content, intro: `${content.intro}\n\n${e.title}\n${textRows.join("\n")}` });
  const subject = guest && kind === "nuevo" ? `${c.actorName} te invitó: ${e.title}` : `${c.actorName} ${verb}: ${e.title}`;
  return { subject: subject.slice(0, 120), html: renderEmail(content), text, unsubscribe };
}

type Recipient = { email: string; full_name: string; email_token: string };

async function familyRecipients(c: EventChange): Promise<Recipient[]> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return [];
  const supabase = createClient(supabaseUrl(), supabaseKey(), { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("event_notify_recipients", { p_secret: secret, p_event_id: c.eventId, p_actor: c.actorId });
  if (error) throw new Error(`event_notify_recipients: ${error.message}`);
  return (data ?? []) as Recipient[];
}

/** Envía los avisos que correspondan. No lanza errores: solo los registra. */
export async function notifyEventChange(c: EventChange) {
  try {
    if (!process.env.RESEND_API_KEY) return;
    const msgs: { to: string; kind: Kind; audience: Audience; name: string; token: string }[] = [];

    const familyChanged = c.kind !== "cambio" || !c.before || diff(c.before, c.event, "familia").length > 0;
    if (c.family && c.kind !== "cancelado" && familyChanged) {
      for (const r of await familyRecipients(c)) {
        msgs.push({ to: r.email, kind: c.kind, audience: "familia", name: (r.full_name || "").split(" ")[0] || "", token: r.email_token });
      }
    }

    // Un invitado que ya recibe el aviso de la familia (o quien hizo el cambio) no recibe otro.
    const skip = new Set([...msgs.map((m) => m.to.toLowerCase()), (c.actorEmail ?? "").toLowerCase()]);
    const guestChanged = c.kind !== "cambio" || !c.before || diff(c.before, c.event, "invitado").length > 0;
    const guests: [Guest, Kind][] = [
      ...(guestChanged ? c.guests.map((g) => [g, c.kind] as [Guest, Kind]) : []),
      ...(c.newGuests ?? []).map((g) => [g, "nuevo"] as [Guest, Kind]),
    ];
    for (const [g, kind] of guests) {
      if (skip.has(g.email.toLowerCase())) continue;
      skip.add(g.email.toLowerCase());
      msgs.push({ to: g.email, kind, audience: "invitado", name: "", token: g.token });
    }

    await sendBatch(
      msgs.map((m) => {
        const r = renderEventChange(c, m.kind, { audience: m.audience, name: m.name, token: m.token });
        return {
          to: m.to,
          subject: r.subject,
          html: r.html,
          text: r.text,
          headers: { "List-Unsubscribe": `<${r.unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        };
      }),
    );
  } catch (e) {
    console.error("aviso de actividad:", (e as Error).message);
  }
}
