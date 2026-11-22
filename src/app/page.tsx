import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/family";

const FEATURES = [
  {
    icon: "🙋",
    title: "Cada cosa tiene un responsable",
    text: "“Llevar a la Sofi al dentista” no es solo una hora: alguien se encarga. Si no puede, pide relevo y otro toma la posta.",
  },
  {
    icon: "⚖️",
    title: "Balance del hogar",
    text: "Mira cuánto organiza cada uno en la semana. El trabajo invisible se vuelve visible, y se reparte mejor.",
  },
  {
    icon: "👵",
    title: "Toda la familia, incluso sin app",
    text: "Niños, abuelos y mascotas aparecen en la agenda aunque no tengan cuenta. Nadie queda fuera.",
  },
  {
    icon: "🔒",
    title: "Lo tuyo y lo de todos",
    text: "Cada actividad puede ser familiar, solo tuya, o aparecer como “ocupado” sin detalles.",
  },
  {
    icon: "☀️",
    title: "Hoy en familia",
    text: "Sin grillas llenas de colores: qué pasa hoy, quién se encarga y qué falta por resolver.",
  },
  {
    icon: "📅",
    title: "En tu calendario de siempre",
    text: "Conéctala a Google Calendar o al del iPhone y recibe los avisos donde ya los ves.",
  },
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
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent">Agenda familiar y personal</p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">En tu familia, todos cuentan.</h1>
        <p className="mt-4 text-lg text-muted">
          La agenda donde cada cosa tiene quién se encargue, nadie carga solo con todo y el trabajo que no se ve, por fin se ve.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/ingresar?siguiente=/crear" className="btn-primary">
            Crear la agenda de mi familia
          </Link>
          <Link href="/ingresar?siguiente=/unirse" className="btn-secondary">
            Tengo una invitación
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
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">El sello Uniluva</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">No necesitas ser famoso para ser importante.</h2>
        <p className="mt-2 max-w-2xl text-muted">
          Quien recuerda el control del niño, quien compra el regalo, quien va a buscar a la abuela. En Uniluva, todo lo que haces por tu familia
          cuenta y se agradece.
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
