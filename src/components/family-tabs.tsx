"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, CalendarDays, HandHeart, Scale, Sun, Users } from "lucide-react";

/** Pestañas dentro de la sección Familia (la barra principal es siempre la misma). */
export function FamilyTabs({ id, name, openReliefs, canSwitch }: { id: string; name: string; openReliefs: number; canSwitch: boolean }) {
  const pathname = usePathname();
  const base = `/f/${id}`;
  const items: { href: string; label: string; Icon: typeof Sun; badge?: number; also?: string }[] = [
    { href: base, label: "Resumen", Icon: Sun },
    { href: `${base}/calendario`, label: "Calendario", Icon: CalendarDays, also: `${base}/semana` },
    { href: `${base}/relevos`, label: "Relevos", Icon: HandHeart, badge: openReliefs },
    { href: `${base}/balance`, label: "Balance", Icon: Scale },
    { href: `${base}/familia`, label: "Integrantes", Icon: Users },
  ];
  const isActive = (it: (typeof items)[number]) =>
    it.href === base ? pathname === base : pathname.startsWith(it.href) || (!!it.also && pathname.startsWith(it.also));

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <p className="eyebrow truncate">{name}</p>
        {canSwitch && (
          <Link href="/inicio?lista=1" className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg">
            <ArrowLeftRight className="size-3.5" /> Cambiar
          </Link>
        )}
      </div>
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" aria-label={`Secciones de ${name}`}>
        {items.map((it) => {
          const active = isActive(it);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg"
              }`}
            >
              <it.Icon className="size-4" />
              {it.label}
              {!!it.badge && <span className="rounded-full bg-sun px-1.5 text-[11px] leading-5 font-bold text-white">{it.badge}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
