"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, HandHeart, Plus, Scale, Sun, Users } from "lucide-react";

export function FamilyNav({ id, openReliefs }: { id: string; openReliefs: number }) {
  const pathname = usePathname();
  const base = `/f/${id}`;
  const items = [
    { href: base, label: "Hoy", Icon: Sun },
    { href: `${base}/semana`, label: "Semana", Icon: CalendarDays },
    { href: `${base}/relevos`, label: "Relevos", Icon: HandHeart, badge: openReliefs },
    { href: `${base}/balance`, label: "Balance", Icon: Scale },
    { href: `${base}/familia`, label: "Familia", Icon: Users },
  ];
  const isActive = (href: string) => (href === base ? pathname === base : pathname.startsWith(href));
  const mobile = [items[0], items[1], null, items[2], items[3]];

  return (
    <>
      {/* Escritorio */}
      <nav className="sticky top-16 z-20 hidden bg-bg/85 backdrop-blur-xl sm:block" aria-label="Secciones">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-1 px-4 pb-3">
          {items.map(({ href, label, Icon, badge }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive(href) ? "bg-fg text-bg" : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              <Icon className="size-4" />
              {label}
              {!!badge && <span className="rounded-full bg-sun px-1.5 text-[11px] leading-5 font-bold text-white">{badge}</span>}
            </Link>
          ))}
          <Link href={`${base}/nuevo`} className="btn-primary ml-auto min-h-10 py-2">
            <Plus className="size-4" /> Agregar
          </Link>
        </div>
      </nav>

      {/* Celular: barra flotante con el botón de agregar al centro */}
      <nav
        className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-40 rounded-full bg-surface/95 shadow-soft ring-1 ring-line backdrop-blur-xl sm:hidden"
        aria-label="Secciones"
      >
        <div className="grid grid-cols-5 items-center">
          {mobile.map((it) =>
            it ? (
              <Link
                key={it.href}
                href={it.href}
                aria-current={isActive(it.href) ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive(it.href) ? "text-accent" : "text-muted"}`}
              >
                <it.Icon className="size-5" strokeWidth={isActive(it.href) ? 2.4 : 1.8} />
                {it.label}
                {!!it.badge && (
                  <span className="absolute top-1.5 left-1/2 ml-1.5 min-w-4 rounded-full bg-sun px-1 text-center text-[10px] leading-4 font-bold text-white">{it.badge}</span>
                )}
              </Link>
            ) : (
              <Link key="nuevo" href={`${base}/nuevo`} className="mx-auto -my-3 grid size-14 place-items-center rounded-full bg-accent text-accent-fg shadow-soft ring-4 ring-bg transition active:scale-95" aria-label="Agregar actividad">
                <Plus className="size-7" strokeWidth={2.4} />
              </Link>
            ),
          )}
        </div>
      </nav>
    </>
  );
}
