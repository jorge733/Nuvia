// Envío de correos con la API de Resend.
export const FROM = "Uniluva <hola@uniluva.com>";

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string; headers?: Record<string, string> }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Falta RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text, headers: msg.headers }),
  });
  if (!res.ok) throw new Error(`Resend respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as { id: string };
}

type Msg = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };

/** Varios correos en una sola llamada (máximo 100). */
export async function sendBatch(msgs: Msg[]) {
  if (!msgs.length) return;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Falta RESEND_API_KEY");
  for (let i = 0; i < msgs.length; i += 100) {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(msgs.slice(i, i + 100).map((m) => ({ from: FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text, headers: m.headers }))),
    });
    if (!res.ok) throw new Error(`Resend respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}
