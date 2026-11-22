import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/community";

const FEATURES = [
  { icon: "💳", title: "Gastos comunes", text: "Cuánto debes, cuándo vence y el detalle del mes. Informa tu pago con el comprobante." },
  { icon: "📅", title: "Reuniones", text: "La próxima asamblea, la tabla y el acta. Confirma asistencia y agrégala a tu calendario." },
  { icon: "📁", title: "Documentos", text: "Reglamento, actas, presupuestos y contratos siempre a mano, sin buscar en el correo." },
  { icon: "📣", title: "Reclamos y sugerencias", text: "Con seguimiento visible: recibido, en revisión, resuelto. Las sugerencias se pueden apoyar." },
  { icon: "✉️", title: "Contacto con la administración", text: "Mensajes privados que no se pierden en el grupo de WhatsApp." },
  { icon: "💬", title: "Chats de la comunidad", text: "El grupo de WhatsApp y el de ventas, solo para vecinos verificados." },
];

export default async function Home() {
  if (await getUser()) redirect("/inicio");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-14">
      <header className="mb-14 flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight">
          Uniluva<span className="text-accent">.</span>
        </span>
        <Link href="/ingresar" className="btn-secondary">
          Ingresar
        </Link>
      </header>

      <section className="max-w-2xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent">
          Edificios · Condominios · Pasajes · Vecindarios
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Tu comunidad, en un solo lugar.</h1>
        <p className="mt-4 text-lg text-muted">
          Gastos comunes, la próxima reunión, todos los documentos, reclamos y los oficios de confianza que recomiendan tus
          vecinos. Sin PDFs perdidos ni grupos de WhatsApp desordenados.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/ingresar?siguiente=/crear" className="btn-primary">
            Crear mi comunidad
          </Link>
          <Link href="/ingresar?siguiente=/unirse" className="btn-secondary">
            Tengo un código de invitación
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card">
            <div className="mb-2 text-2xl" aria-hidden>
              {f.icon}
            </div>
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="card mt-6 bg-accent-soft sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Oficios recomendados por vecinos</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">No necesitas ser famoso para ser importante.</h2>
        <p className="mt-2 max-w-2xl text-muted">
          El gásfiter que arregló el calefont del 304, la electricista que recomienda el pasaje de al lado. Uniluva le da
          visibilidad a quienes trabajan bien, con recomendaciones reales de vecinos verificados de tu comuna.
        </p>
      </section>

      <footer className="mt-16 flex flex-wrap gap-4 border-t border-line pt-6 text-sm text-muted">
        <span>© {new Date().getFullYear()} Uniluva</span>
        <Link href="/privacidad" className="hover:text-fg">
          Privacidad
        </Link>
        <Link href="/terminos" className="hover:text-fg">
          Términos
        </Link>
      </footer>
    </main>
  );
}
