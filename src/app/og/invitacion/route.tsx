import { OG_INVITE, renderOg } from "@/lib/og";

export const dynamic = "force-static";

// Imagen para los enlaces de invitación compartidos por WhatsApp.
export function GET() {
  return renderOg(OG_INVITE);
}
