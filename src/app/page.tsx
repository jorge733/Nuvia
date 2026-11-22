import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarSync, EyeOff, HandHeart, Scale, Sun, Users } from "lucide-react";
import { hasSession } from "@/lib/family";
import { FamilyCircles, Logo } from "@/components/logo";

const FEATURES = [
  { Icon: HandHeart, title: "Responsables y relevos", text: "Cada cosa tiene quién se encargue. Si no puede, pide relevo y otro toma la posta con un toque." },
  { Icon: Scale, title: "Balance del hogar", text: "Cuánto organiza cada uno en la semana. El trabajo invisible se vuelve visible y se reparte mejor." },
  { Icon: Users, title: "Todos, incluso sin app", text: "Niños, abuelos y mascotas son parte de la agenda aunque no tengan cuenta." },
  { Icon: EyeOff, title: "Lo tuyo y lo de todos", text: "Cada actividad puede ser familiar, solo tuya, o mostrarse como “ocupado” sin detalles." },
  { Icon: Sun, title: "Hoy en familia", text: "Sin grillas abrumadoras: qué pasa hoy, quién se encarga y qué falta por resolver." },
  { Icon: CalendarSync, title: "En tu calendario de siempre", text: "Conéctala a Google Calendar o al del iPhone y recibe los avisos donde ya los ves." },
];

export default async function Home() {
  if (await hasSession()) redirect("/inicio");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/ingresar" className="btn-secondary">
          Ingresar
        </Link>
      </header>

      <section className="grid items-center gap-8 py-12 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
        <div className="stagger">
          <p className="eyebrow text-accent">Agenda familiar y personal</p>
          <h1 className="mt-3 text-5xl leading-[1.02] font-semibold sm:text-7xl">
            En tu familia, <em className="text-accent">todos</em> cuentan.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted">
            La agenda donde cada cosa tiene quién se encargue, nadie carga solo con todo y el trabajo que no se ve, por fin se ve.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/ingresar?siguiente=/crear" className="btn-primary px-6 text-base">
              Crear la agenda de mi familia
            </Link>
            <Link href="/ingresar?siguiente=/unirse" className="btn-secondary px-6 text-base">
              Tengo una invitación
            </Link>
          </div>
        </div>
        <FamilyCircles className="mx-auto w-full max-w-md" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ Icon, title, text }) => (
          <div key={title} className="reveal card">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Icon className="size-5" />
            </span>
            <h2 className="mt-4 text-xl font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>

      <section className="reveal hero-glow relative mt-6 overflow-hidden rounded-[2rem] p-8 text-white sm:p-12" style={{ background: "var(--hero)" }}>
        <div className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full bg-white/10" aria-hidden />
        <p className="eyebrow text-white/70">El sello Uniluva</p>
        <h2 className="mt-3 max-w-2xl text-3xl leading-tight font-semibold sm:text-5xl">No necesitas ser famoso para ser importante.</h2>
        <p className="mt-4 max-w-xl text-white/85">
          Quien recuerda el control del niño, quien compra el regalo, quien va a buscar a la abuela. En Uniluva, todo lo que haces por tu familia
          cuenta y se agradece.
        </p>
      </section>

      <footer className="mt-12 flex flex-wrap items-center gap-5 border-t border-line py-8 text-sm text-muted">
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
