import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/community";
import { Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { sendMagicLink } from "./actions";

export const metadata = { title: "Ingresar" };

export default async function Ingresar({ searchParams }: PageProps<"/ingresar">) {
  const sp = await searchParams;
  const siguiente = typeof sp.siguiente === "string" && sp.siguiente.startsWith("/") ? sp.siguiente : "/inicio";
  if (await getUser()) redirect(siguiente);
  const enviado = typeof sp.enviado === "string" ? sp.enviado : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-8 text-xl font-bold tracking-tight">
        Uniluva<span className="text-accent">.</span>
      </Link>

      {enviado ? (
        <div className="card">
          <div className="mb-3 text-3xl" aria-hidden>
            📬
          </div>
          <h1 className="text-xl font-bold">Revisa tu correo</h1>
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
          <h1 className="text-xl font-bold">Ingresar a Uniluva</h1>
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
