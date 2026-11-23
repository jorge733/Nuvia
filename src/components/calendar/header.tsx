import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalView } from "@/lib/calendar";

const VIEWS: { key: CalView | "lista"; label: string }[] = [
  { key: "mes", label: "Mes" },
  { key: "semana", label: "Semana" },
  { key: "dia", label: "Día" },
  { key: "lista", label: "Lista" },
];

/** Título, flechas y selector de vista del calendario. */
export function CalendarHeader({
  title,
  eyebrow,
  view,
  prevHref,
  nextHref,
  todayHref,
  viewHref,
}: {
  title: string;
  eyebrow?: string;
  view: CalView | "lista";
  prevHref: string;
  nextHref: string;
  todayHref: string;
  viewHref: (v: CalView | "lista") => string;
}) {
  return (
    <div className="mb-5 space-y-4 lg:flex lg:items-end lg:gap-6 lg:space-y-0">
      <div className="flex items-end justify-between gap-3 lg:contents">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="truncate text-3xl font-semibold sm:text-4xl">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1 lg:order-3">
          <Link href={prevHref} className="btn-ghost size-11 px-0" aria-label="Anterior">
            <ChevronLeft className="size-5" />
          </Link>
          <Link href={todayHref} className="btn-secondary min-h-10 px-4 py-1.5">
            Hoy
          </Link>
          <Link href={nextHref} className="btn-ghost size-11 px-0" aria-label="Siguiente">
            <ChevronRight className="size-5" />
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-4 rounded-full bg-surface-2 p-1 text-sm font-semibold lg:order-2 lg:ml-auto lg:w-[26rem]" role="tablist" aria-label="Vista">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={viewHref(v.key)}
            role="tab"
            aria-selected={view === v.key}
            className={`rounded-full py-2 text-center transition ${view === v.key ? "bg-surface shadow-soft" : "text-muted hover:text-fg"}`}
          >
            {v.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
