"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Plus, Sun, UserRound, Users } from "lucide-react";

/** Barra única de la app: lo tuyo primero y la familia como una sección más. */
export function MyNav({ familyHref, addHref = "/mi/nuevo" }: { familyHref: string; addHref?: string }) {
  const pathname = usePathname();
  const inFamily = pathname.startsWith("/f/") || pathname.startsWith("/inicio") || pathname.startsWith("/crear");
  const items = [
    { href: "/mi", label: "Hoy", Icon: Sun, active: pathname === "/mi" },
    { href: "/mi/calendario", label: "Calendario", Icon: CalendarDays, active: pathname.startsWith("/mi/calendario") || pathname.startsWith("/mi/semana") },
    { href: familyHref, label: "Familia", Icon: Users, active: inFamily },
    { href: "/perfil", label: "Perfil", Icon: UserRound, active: pathname.startsWith("/perfil") },
  ];
  const mobile = [items[0], items[1], null, items[2], items[3]];

  return (
    <>
      <nav className="sticky top-16 z-20 hidden bg-bg/85 backdrop-blur-xl sm:block" aria-label="Secciones">
        <div className="mx-auto flex w-full max-w-3xl lg:max-w-6xl items-center gap-1 px-4 pb-3">
          {items.slice(0, 3).map(({ href, label, Icon, active }) => (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-fg text-bg" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
          <Link href={addHref} className="spin-plus btn-primary ml-auto min-h-10 py-2">
            <Plus className="size-4" /> Agregar
          </Link>
        </div>
      </nav>

      <nav
        className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-40 rounded-full bg-surface/95 shadow-soft ring-1 ring-line backdrop-blur-xl sm:hidden"
        aria-label="Secciones"
      >
        <div className="grid grid-cols-5 items-center">
          {mobile.map((it) =>
            it ? (
              <Link
                key={it.label}
                href={it.href}
                aria-current={it.active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${it.active ? "text-accent" : "text-muted"}`}
              >
                <it.Icon className="size-5" strokeWidth={it.active ? 2.4 : 1.8} />
                {it.label}
              </Link>
            ) : (
              <Link key="nuevo" href={addHref} className="spin-plus mx-auto -my-3 grid size-14 place-items-center rounded-full bg-accent text-accent-fg shadow-soft ring-4 ring-bg transition active:scale-95" aria-label="Agregar actividad">
                <Plus className="size-7" strokeWidth={2.4} />
              </Link>
            ),
          )}
        </div>
      </nav>
    </>
  );
}
