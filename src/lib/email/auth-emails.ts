import { renderEmail, renderText, type EmailContent } from "./layout";

// Contenido de cada correo de autenticación según el tipo que envía Supabase.
export function authEmail(action: string, url: string, email: string, otp?: string) {
  const footer = `Recibiste este correo porque alguien pidió ingresar a Uniluva con ${email}. Si no fuiste tú, puedes ignorarlo: nadie podrá entrar sin este enlace.`;
  const note = "Ábrelo desde este mismo dispositivo. El enlace vence en 1 hora y sirve una sola vez.";
  const byAction: Record<string, { subject: string; content: EmailContent }> = {
    magiclink: {
      subject: "Tu enlace para entrar a Uniluva",
      content: { preheader: "Toca el botón para entrar. Sin contraseñas.", heading: "Hola de nuevo 👋", intro: "Toca el botón para entrar a tu agenda. Sin contraseñas, sin complicaciones.", button: { label: "Entrar a Uniluva", url }, note, footer },
    },
    signup: {
      subject: "Bienvenido/a a Uniluva",
      content: { preheader: "Confirma tu correo y empieza a organizar a tu familia.", heading: "¡Bienvenido/a a Uniluva!", intro: "La agenda donde cada cosa tiene quién se encargue y todos cuentan. Confirma tu correo para empezar.", button: { label: "Confirmar y entrar", url }, note, footer },
    },
    invite: {
      subject: "Te invitaron a Uniluva",
      content: { preheader: "Acepta la invitación para entrar.", heading: "Te invitaron a Uniluva", intro: "Alguien quiere organizarse contigo. Acepta la invitación para entrar.", button: { label: "Aceptar invitación", url }, note, footer },
    },
    email_change: {
      subject: "Confirma tu nuevo correo en Uniluva",
      content: { preheader: "Confirma el cambio de correo.", heading: "Confirma tu nuevo correo", intro: "Toca el botón para confirmar el cambio de correo de tu cuenta.", button: { label: "Confirmar correo", url }, note, footer },
    },
    reauthentication: {
      subject: "Tu código de Uniluva",
      content: { preheader: `Tu código es ${otp ?? ""}`, heading: "Tu código de verificación", intro: `Usa este código para continuar: ${otp ?? ""}`, footer },
    },
  };
  const chosen = byAction[action] ?? byAction.magiclink;
  return { subject: chosen.subject, html: renderEmail(chosen.content), text: renderText(chosen.content) };
}
