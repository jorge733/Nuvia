// Plantilla base de los correos de Uniluva (HTML compatible con clientes de correo).

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const SANS = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

export type EmailContent = {
  preheader: string;
  heading: string;
  intro: string;
  /** HTML ya escapado para el cuerpo (opcional). */
  bodyHtml?: string;
  button?: { label: string; url: string };
  note?: string;
  footer: string;
};

export function renderEmail(c: EmailContent) {
  const button = c.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td align="center" style="border-radius:999px;background:#5b3fd9;">
          <a href="${esc(c.button.url)}" target="_blank" style="display:block;padding:16px 28px;font-family:${SANS};font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(c.button.label)}</a>
        </td></tr></table>`
    : "";
  const fallback = c.button
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td style="border-top:1px solid #eae2d6;font-size:0;line-height:0;">&nbsp;</td></tr></table>
       <p style="margin:20px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:#6f675c;">¿No funciona el botón? Copia este enlace en tu navegador:<br>
       <a href="${esc(c.button.url)}" style="color:#5b3fd9;word-break:break-all;">${esc(c.button.url)}</a></p>`
    : "";
  const dot = (color: string) =>
    `<td width="14" height="14" style="width:14px;height:14px;max-height:14px;background:${color};border-radius:7px;font-size:1px;line-height:1px;">&nbsp;</td>`;
  const gap = `<td width="4" style="width:4px;font-size:1px;line-height:1px;">&nbsp;</td>`;

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(c.heading)}</title></head>
<body style="margin:0;padding:0;background:#faf6f0;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6f0;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
  <tr><td align="center" style="padding-bottom:28px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle"><table role="presentation" cellpadding="0" cellspacing="0"><tr style="height:14px;">${dot("#5b3fd9")}${gap}${dot("#f2763a")}${gap}${dot("#2fa36b")}</tr></table></td>
      <td valign="middle" style="padding-left:10px;font-family:${SERIF};font-size:24px;font-weight:bold;color:#1f1b16;letter-spacing:-0.3px;">uniluva</td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#ffffff;border-radius:24px;padding:40px 32px;">
    <h1 style="margin:0 0 12px;font-family:${SERIF};font-size:28px;line-height:1.2;font-weight:bold;color:#1f1b16;">${esc(c.heading)}</h1>
    <p style="margin:0 0 28px;font-family:${SANS};font-size:16px;line-height:1.6;color:#6f675c;">${esc(c.intro)}</p>
    ${c.bodyHtml ?? ""}
    ${button}
    ${c.note ? `<p style="margin:24px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:#6f675c;">${esc(c.note)}</p>` : ""}
    ${fallback}
  </td></tr>
  <tr><td align="center" style="padding:28px 16px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:#8a8278;">
    <em style="font-family:${SERIF};font-size:14px;color:#6f675c;">En tu familia, todos cuentan.</em><br><br>${esc(c.footer)}
  </td></tr>
</table></td></tr></table></body></html>`;
}

export function renderText(c: EmailContent) {
  return [c.heading, "", c.intro, c.button ? `\n${c.button.label}: ${c.button.url}` : "", c.note ? `\n${c.note}` : "", "", "—", "Uniluva · En tu familia, todos cuentan."].join("\n");
}

export { esc };
