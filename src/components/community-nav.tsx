"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function CommunityNav({ id, canManage }: { id: string; canManage: boolean }) {
  const pathname = usePathname();
  const base = `/c/${id}`;
  const items = [
    { href: base, label: "Resumen" },
    { href: `${base}/gastos`, label: "Gastos" },
    { href: `${base}/reuniones`, label: "Reuniones" },
    { href: `${base}/documentos`, label: "Documentos" },
    { href: `${base}/reclamos`, label: "Reclamos" },
    { href: `${base}/oficios`, label: "Oficios" },
    ...(canManage ? [{ href: `${base}/admin`, label: "Administrar" }] : []),
  ];

  return (
    <nav className="border-b border-line bg-bg" aria-label="Secciones de la comunidad">
      <div className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
        {items.map((it) => {
          const active = it.href === base ? pathname === base : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition ${
                active ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
