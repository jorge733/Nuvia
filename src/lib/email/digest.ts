import { CATEGORIES } from "@/lib/format";
import { addDays, capitalize, dayKey, expand, formatDay, startOfDay, timeOf } from "@/lib/time";
import { esc, renderEmail, renderText } from "./layout";

export type DigestRow = {
  user_id: string;
  email: string;
  full_name: string;
  email_token: string;
  family_id: string;
  family_name: string;
  is_personal: boolean;
  my_member_id: string;
  event_id: string;
  title: string;
  location: string | null;
  category: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  visibility: string;
  recurrence: string;
  recur_interval: number;
  recur_until: string | null;
  created_by: string | null;
  responsible_id: string | null;
  participant_ids: string[];
  skipped: string[];
  completed: string[];
  reliefs: { at: string; status: string; taken_by: string | null; requested_by: string | null }[];
};

type Item = { start: Date; allDay: boolean; title: string; emoji: string; where: string; location: string | null; personal: boolean };
type Relief = { start: Date; title: string; family: string };

export type Digest = { to: string; name: string; token: string; today: Item[]; reliefs: Relief[] };

/** Agrupa las filas por persona y calcula lo que le toca hoy y los relevos abiertos (hoy y mañana). */
export function buildDigests(rows: DigestRow[], today: string): Digest[] {
  const from = startOfDay(today);
  const to = startOfDay(addDays(today, 1));
  const reliefTo = startOfDay(addDays(today, 2));
  const byUser = new Map<string, Digest>();

  for (const r of rows) {
    let d = byUser.get(r.user_id);
    if (!d) {
      d = { to: r.email, name: (r.full_name || "").split(" ")[0] || "", token: r.email_token, today: [], reliefs: [] };
      byUser.set(r.user_id, d);
    }
    const skipped = new Set(r.skipped.map((s) => new Date(s).getTime()));
    const done = new Set(r.completed.map((s) => new Date(s).getTime()));
    const reliefs = new Map(r.reliefs.map((x) => [new Date(x.at).getTime(), x]));

    for (const occ of expand(r, from, reliefTo)) {
      const t = occ.start.getTime();
      if (skipped.has(t) || occ.start >= reliefTo) continue;
      const relief = reliefs.get(t);
      const responsible = relief?.status === "tomado" ? relief.taken_by : r.responsible_id;

      // Relevos abiertos que esta persona podría tomar (no los que pidió ella).
      if (!r.is_personal && relief?.status === "abierto" && relief.requested_by !== r.my_member_id && occ.start.getTime() >= Date.now()) {
        d.reliefs.push({ start: occ.start, title: r.title, family: r.family_name });
      }
      if (occ.start >= to || dayKey(occ.start) !== today || done.has(t)) continue;

      const mine =
        r.is_personal ||
        responsible === r.my_member_id ||
        r.participant_ids.includes(r.my_member_id) ||
        (r.created_by === r.user_id && r.visibility !== "familia");
      if (!mine) continue;
      d.today.push({
        start: occ.start,
        allDay: r.all_day,
        title: r.title,
        emoji: CATEGORIES[r.category]?.emoji ?? "📌",
        where: r.is_personal ? "Solo yo" : r.family_name,
        location: r.location,
        personal: r.is_personal,
      });
    }
  }

  const out = [...byUser.values()].filter((d) => d.today.length || d.reliefs.length);
  for (const d of out) {
    d.today.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.getTime() - b.start.getTime());
    d.reliefs.sort((a, b) => a.start.getTime() - b.start.getTime());
  }
  return out;
}

const SANS = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function renderDigest(d: Digest, today: string, site: string) {
  const unsubscribe = `${site}/api/correo/baja?t=${d.token}`;
  const rows = d.today
    .map(
      (i) => `<tr>
        <td valign="top" style="padding:12px 12px 12px 0;width:64px;font-family:${SANS};font-size:14px;font-weight:bold;color:#1f1b16;white-space:nowrap;">${i.allDay ? "Todo el día" : timeOf(i.start)}</td>
        <td valign="top" style="padding:12px 0;border-left:3px solid ${i.personal ? "#5b3fd9" : "#f2763a"};padding-left:12px;font-family:${SANS};">
          <div style="font-size:15px;font-weight:bold;color:#1f1b16;">${i.emoji} ${esc(i.title)}</div>
          <div style="margin-top:2px;font-size:12px;color:#6f675c;">${esc(i.where)}${i.location ? ` · ${esc(i.location)}` : ""}</div>
        </td></tr>`,
    )
    .join("");
  const reliefRows = d.reliefs
    .map(
      (r) =>
        `<li style="margin:6px 0;">${esc(r.title)} · ${dayKey(r.start) === today ? "hoy" : "mañana"} ${timeOf(r.start)} <span style="color:#8a8278;">(${esc(r.family)})</span></li>`,
    )
    .join("");

  const bodyHtml = `
    ${d.today.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${rows}</table>` : ""}
    ${
      d.reliefs.length
        ? `<div style="margin:0 0 24px;padding:16px 18px;background:#ffeadf;border-radius:16px;font-family:${SANS};">
            <div style="font-size:14px;font-weight:bold;color:#c2551f;">🙋 Tu familia necesita relevo</div>
            <ul style="margin:8px 0 0;padding-left:18px;font-size:14px;color:#1f1b16;">${reliefRows}</ul>
          </div>`
        : ""
    }`;

  const n = d.today.length;
  const first = d.today[0];
  const subject = n
    ? `Tu día: ${n} ${n === 1 ? "cosa" : "cosas"}${first && !first.allDay ? ` · ${first.title} ${timeOf(first.start)}` : ""}`
    : "Tu familia necesita relevo";
  const content = {
    preheader: n ? d.today.map((i) => i.title).slice(0, 3).join(" · ") : "Alguien de tu familia pidió relevo.",
    heading: `Buenos días${d.name ? `, ${d.name}` : ""}`,
    intro: n
      ? `${capitalize(formatDay(today))}. Esto es lo que te toca hoy.`
      : `${capitalize(formatDay(today))}. Hoy no tienes nada a tu cargo, pero alguien de tu familia necesita una mano.`,
    bodyHtml,
    button: { label: "Abrir mi agenda", url: `${site}/mi` },
    footer: "Recibes este resumen porque usas Uniluva.",
    footerLink: { label: "Darme de baja", url: unsubscribe },
    fallback: false,
  };
  return { subject: subject.slice(0, 120), html: renderEmail(content), text: renderText(content), unsubscribe };
}
