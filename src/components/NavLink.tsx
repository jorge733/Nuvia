"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  label,
  icon,
  badge,
  compact,
}: {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  compact?: boolean;
}) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path.startsWith(href);

  const badgeEl =
    badge && badge > 0 ? (
      <span className="absolute -top-1 left-4 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-4 text-white">
        {badge > 99 ? "99+" : badge}
      </span>
    ) : null;

  if (compact) {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "font-semibold text-brand" : "text-muted"}`}
      >
        <span className="relative text-xl leading-none">
          {icon}
          {badgeEl}
        </span>
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${active ? "bg-brand/10 font-semibold text-brand" : "hover:bg-soft"}`}
    >
      <span className="relative text-lg">
        {icon}
        {badgeEl}
      </span>
      {label}
    </Link>
  );
}
