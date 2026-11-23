"use server";

import { after } from "next/server";
import { back, text } from "@/lib/family";
import { siteUrl } from "@/lib/site";
import { anonClient, getGuestEvent, isShareToken } from "@/lib/guest";
import { renderEventChange } from "@/lib/email/event-change";
import { sendBatch } from "@/lib/email/resend";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Desde el enlace compartido: dejar el correo para quedar como invitado. */
export async function joinSharedEvent(token: string, formData: FormData) {
  const path = `/invitacion/${isShareToken(token) ? token : ""}`;
  const email = text(formData, "email").toLowerCase();
  if (!isShareToken(token)) back("/", { error: "Enlace no válido" });
  if (email.length > 254 || !EMAIL.test(email)) back(path, { error: "Revisa tu correo" });

  const { data: guestToken, error } = await anonClient().rpc("join_shared_event", { p_token: token, p_email: email });
  if (error) back(path, { error: error.message.includes("Máximo") ? "Esta actividad ya no acepta más invitados" : "No se pudo guardar. Inténtalo de nuevo." });
  if (!guestToken) back(path, { ok: "Ese correo ya estaba invitado. Te avisaremos si algo cambia." });

  // Le mandamos su invitación: trae su enlace personal (para ver la actividad y dejar de recibir avisos).
  const [ev, site] = await Promise.all([getGuestEvent(guestToken as string), siteUrl()]);
  if (ev && process.env.RESEND_API_KEY) {
    after(async () => {
      try {
        const m = renderEventChange(
          {
            kind: "nuevo",
            site,
            familyId: "",
            familyName: ev.family_name,
            eventId: ev.event_id,
            actorId: "",
            actorEmail: null,
            actorName: ev.inviter ?? "Alguien",
            event: {
              title: ev.title,
              category: ev.category,
              starts_at: ev.starts_at,
              ends_at: ev.ends_at,
              all_day: ev.all_day,
              location: ev.location,
              notes: ev.notes,
              recurrence: ev.recurrence,
              responsible: null,
              participants: [],
              guests: [],
            },
            family: false,
            guests: [],
          },
          "nuevo",
          { audience: "invitado", name: "", token: guestToken as string },
        );
        await sendBatch([
          {
            to: email,
            subject: m.subject,
            html: m.html,
            text: m.text,
            headers: { "List-Unsubscribe": `<${m.unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          },
        ]);
      } catch (e) {
        console.error("invitación por enlace:", (e as Error).message);
      }
    });
  }
  back(path, { ok: `¡Listo! Te enviamos la invitación a ${email}. Te avisaremos si algo cambia.` });
}
