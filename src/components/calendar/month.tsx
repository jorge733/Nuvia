import Link from "next/link";
import { keyParts } from "@/lib/time";
import type { CalItem } from "./types";

const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

/** Grilla del mes: cada día con sus actividades (barras en escritorio, puntos en celular). */
export function MonthView({
  weeks,
  month,
  today,
  selected,
  byDay,
  dayHref,
}: {
  weeks: string[][];
  month: number;
  today: string;
  selected: string;
  byDay: Map<string, CalItem[]>;
  dayHref: (day: string) => string;
}) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="grid grid-cols-7 border-b border-line text-center text-[11px] font-bold text-muted">
        {LETTERS.map((l, i) => (
          <div key={i} className="py-2.5">
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((d, i) => {
          const items = byDay.get(d) ?? [];
          const { d: num, m } = keyParts(d);
          const out = m !== month;
          const isToday = d === today;
          const isSel = d === selected;
          return (
            <Link
              key={d}
              href={dayHref(d)}
              scroll={false}
              aria-label={`${d}${items.length ? `, ${items.length} actividades` : ""}`}
              aria-current={isSel ? "date" : undefined}
              className={`group relative flex min-h-16 flex-col gap-1 border-line p-1 transition sm:min-h-28 sm:p-1.5 ${i % 7 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""} ${
                isSel ? "bg-accent-soft" : "hover:bg-surface-2"
              } ${out ? "opacity-45" : ""}`}
            >
              <span
                className={`mx-auto grid size-7 place-items-center rounded-full font-display text-sm font-semibold sm:mx-0 ${
                  isToday ? "bg-accent text-accent-fg" : isSel ? "text-accent" : ""
                }`}
              >
                {num}
              </span>
              {/* Celular: puntos */}
              <span className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                {items.slice(0, 4).map((it) => (
                  <span key={it.key} className="size-1.5 rounded-full" style={{ background: it.color, opacity: it.done ? 0.4 : 1 }} />
                ))}
              </span>
              {/* Escritorio: barras con título */}
              <span className="hidden flex-col gap-0.5 sm:flex">
                {items.slice(0, 3).map((it) => (
                  <span
                    key={it.key}
                    className={`truncate rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-semibold ${it.done ? "line-through opacity-50" : ""}`}
                    style={{ background: `color-mix(in srgb, ${it.color} 16%, transparent)`, color: "var(--fg)" }}
                  >
                    <span className="mr-0.5 inline-block size-1.5 -translate-y-px rounded-full align-middle" style={{ background: it.color }} />
                    {it.title}
                  </span>
                ))}
                {items.length > 3 && <span className="px-1.5 text-[11px] font-semibold text-muted">+{items.length - 3} más</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
