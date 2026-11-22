import Link from "next/link";
import { House, Lock } from "lucide-react";
import type { Space } from "@/lib/family";

/** Pestañas para elegir dónde va la actividad: Mi agenda o una familia. */
export function SpaceTabs({ spaces, current, query }: { spaces: Space[]; current: string; query: string }) {
  if (spaces.length < 2) return null;
  return (
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist" aria-label="¿Dónde va?">
      {spaces.map((s) => {
        const active = s.id === current;
        const Icon = s.isPersonal ? Lock : House;
        return (
          <Link
            key={s.id}
            href={`/f/${s.id}/nuevo${query}`}
            role="tab"
            aria-selected={active}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
              active ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg"
            }`}
          >
            <Icon className="size-4" />
            {s.isPersonal ? "Mi agenda" : s.name}
          </Link>
        );
      })}
    </div>
  );
}
