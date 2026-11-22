"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FamilyNav({ id, openReliefs }: { id: string; openReliefs: number }) {
  const pathname = usePathname();
  const base = `/f/${id}`;
  const items = [
    { href: base, label: "Hoy", icon: "☀️" },
    { href: `${base}/semana`, label: "Semana", icon: "🗓️" },
    { href: `${base}/relevos`, label: "Relevos", icon: "🙋", badge: openReliefs },
    { href: `${base}/balance`, label: "Balance", icon: "⚖️" },
    { href: `${base}/familia`, label: "Familia", icon: "👨‍👩‍👧" },
  ];
  const isActive = (href: string) => (href === base ? pathname === base : pathname.startsWith(href));

  return (
    <>
      {/* Escritorio: pestañas bajo el encabezado */}
      <nav className="hidden border-b border-line bg-bg sm:block" aria-label="Secciones">
        <div className="mx-auto flex w-full max-w-3xl gap-1 px-4">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive(it.href) ? "page" : undefined}
              className={`relative border-b-2 px-3 py-3 text-sm font-medium transition ${
                isActive(it.href) ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {it.label}
              {!!it.badge && <span className="ml-1.5 rounded-full bg-warn px-1.5 py-0.5 text-[10px] font-bold text-white">{it.badge}</span>}
            </Link>
          ))}
        </div>
      </nav>

      {/* Celular: barra inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden" aria-label="Secciones">
        <div className="grid grid-cols-5">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive(it.href) ? "page" : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive(it.href) ? "text-accent" : "text-muted"}`}
            >
              <span className="text-lg leading-none" aria-hidden>
                {it.icon}
              </span>
              {it.label}
              {!!it.badge && (
                <span className="absolute top-1 left-1/2 ml-2 rounded-full bg-warn px-1.5 text-[10px] font-bold leading-4 text-white">{it.badge}</span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
