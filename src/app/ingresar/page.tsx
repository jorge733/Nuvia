import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { FamilyCircles, Logo } from "@/components/logo";
import { redirect } from "next/navigation";
import { hasSession } from "@/lib/family";
import { Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { sendMagicLink } from "./actions";

export async function generateMetadata({ searchParams }: PageProps<"/ingresar">): Promise<Metadata> {
  const sp = await searchParams;
  const invite = typeof sp.siguiente === "string" && sp.siguiente.startsWith("/unirse");
  if (!invite) return { title: "Ingresar" };
  const title = "Te invitaron a Uniluva";
  const description = "Únete a la agenda de tu familia: quién lleva, quién compra, quién va. Todos cuentan.";
  const images = [{ url: "/og/invitacion", width: 1200, height: 630, alt: title }];
  return { title, description, openGraph: { title, description, images }, twitter: { card: "summary_large_image", title, description, images } };
}

export default async function Ingresar({ searchParams }: PageProps<"/ingresar">) {
  const sp = await searchParams;
  const siguiente = typeof sp.siguiente === "string" && sp.siguiente.startsWith("/") ? sp.siguiente : "/inicio";
  if (await hasSession()) redirect(siguiente);
  const enviado = typeof sp.enviado === "string" ? sp.enviado : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-6 text-center">
        <Logo />
        <FamilyCircles className="w-40" />
      </div>

      {enviado ? (
        <div className="card">
          <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
            <MailCheck className="size-6" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold">Revisa tu correo</h1>
          <p className="mt-2 text-muted">
            Te enviamos un enlace para ingresar a <strong className="text-fg">{enviado}</strong>. Ábrelo desde este mismo
            dispositivo. Si no llega en un par de minutos, revisa la carpeta de spam.
          </p>
          <Link href={`/ingresar?siguiente=${encodeURIComponent(siguiente)}`} className="link mt-4 inline-block text-sm">
            Usar otro correo
          </Link>
        </div>
      ) : (
        <div className="card">
          <h1 className="text-2xl font-semibold">Entrar a Uniluva</h1>
          <p className="mt-1 text-sm text-muted">Sin contraseñas: te enviamos un enlace a tu correo.</p>
          <div className="mt-5">
            <Flash error={typeof sp.error === "string" ? sp.error : undefined} />
            <form action={sendMagicLink} className="space-y-4">
              <input type="hidden" name="siguiente" value={siguiente} />
              <label className="block">
                <span className="label">Correo electrónico</span>
                <input className="input" type="email" name="email" required autoComplete="email" placeholder="tu@correo.cl" />
              </label>
              <SubmitButton className="btn-primary w-full" pendingText="Enviando…">
                Enviarme el enlace
              </SubmitButton>
            </form>
          </div>
          <p className="mt-5 text-xs text-muted">
            Al ingresar aceptas los{" "}
            <Link href="/terminos" className="link">
              términos
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" className="link">
              política de privacidad
            </Link>
            .
          </p>
        </div>
      )}
    </main>
  );
}
