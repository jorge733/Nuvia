import Link from "next/link";
import { DAY_END, DAY_START, layoutDay } from "@/lib/calendar";
import { capitalize, formatDay, keyParts, timeOf } from "@/lib/time";
import type { CalItem } from "./types";

const HOUR = 52; // alto de una hora en px

/** Grilla por horas (semana o día) con bloques del largo real de cada actividad. */
export function TimeGrid({
  days,
  byDay,
  today,
  nowMinutes,
  newHref,
  dayHref,
}: {
  days: string[];
  byDay: Map<string, CalItem[]>;
  today: string;
  nowMinutes: number;
  newHref: (day: string, hour: number) => string;
  dayHref: (day: string) => string;
}) {
  const hours = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);
  const single = days.length === 1;
  const minW = single ? "" : "min-w-[680px]";

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <div className={minW}>
          {/* Encabezado de días + actividades de todo el día */}
          <div className="grid border-b border-line" style={{ gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))` }}>
            <div />
            {days.map((d) => {
              const allDay = (byDay.get(d) ?? []).filter((i) => i.allDay);
              return (
                <div key={d} className="border-l border-line px-1 py-2 text-center">
                  <Link href={dayHref(d)} className="inline-flex flex-col items-center">
                    <span className="text-[11px] font-bold text-muted uppercase">{formatDay(d, { weekday: "short" }).replace(".", "")}</span>
                    <span
                      className={`mt-0.5 grid size-8 place-items-center rounded-full font-display text-lg font-semibold ${d === today ? "bg-accent text-accent-fg" : ""}`}
                    >
                      {keyParts(d).d}
                    </span>
                  </Link>
                  {allDay.length > 0 && (
                    <div className="mt-1.5 space-y-0.5 text-left">
                      {allDay.map((it) => (
                        <Chip key={it.key} it={it} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Horas */}
          <div className="relative grid" style={{ gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))` }}>
            <div>
              {hours.map((h) => (
                <div key={h} className="relative text-right" style={{ height: HOUR }}>
                  <span className="absolute -top-2 right-2 text-[11px] text-muted tabular-nums">{h === DAY_START ? "" : `${h}:00`}</span>
                </div>
              ))}
            </div>
            {days.map((d) => {
              const timed = (byDay.get(d) ?? []).filter((i) => !i.allDay);
              const placed = layoutDay(timed);
              return (
                <div key={d} className="relative border-l border-line" style={{ height: hours.length * HOUR }}>
                  {/* Huecos: tocar para agregar a esa hora */}
                  {hours.map((h) => (
                    <Link
                      key={h}
                      href={newHref(d, h)}
                      className="block border-t border-line/60 transition hover:bg-accent-soft/60"
                      style={{ height: HOUR }}
                      aria-label={`Agregar el ${d} a las ${h}:00`}
                    />
                  ))}
                  {/* Hora actual */}
                  {d === today && nowMinutes >= DAY_START * 60 && nowMinutes < DAY_END * 60 && (
                    <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((nowMinutes - DAY_START * 60) / 60) * HOUR }}>
                      <span className="-ml-1 size-2.5 rounded-full bg-sun" />
                      <span className="h-0.5 flex-1 bg-sun" />
                    </div>
                  )}
                  {placed.map(({ item: it, top, height, col, cols }) => {
                    const style = {
                      top: (top / 60) * HOUR + 1,
                      height: Math.max((height / 60) * HOUR - 2, 22),
                      left: `calc(${(col / cols) * 100}% + 2px)`,
                      width: `calc(${100 / cols}% - 4px)`,
                      background: `color-mix(in srgb, ${it.color} 18%, var(--surface))`,
                      borderLeft: `3px solid ${it.color}`,
                    };
                    const inner = (
                      <>
                        <span className={`block truncate text-xs leading-4 font-semibold ${it.done ? "line-through opacity-60" : ""}`}>
                          {it.emoji} {it.title}
                        </span>
                        {height >= 45 && (
                          <span className="block truncate text-[11px] text-muted">
                            {timeOf(it.start)}
                            {it.end ? `–${timeOf(it.end)}` : ""}
                          </span>
                        )}
                      </>
                    );
                    return it.href ? (
                      <Link key={it.key} href={it.href} className="absolute z-[5] overflow-hidden rounded-lg px-1.5 py-1 transition hover:brightness-95" style={style}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={it.key} className="absolute z-[5] overflow-hidden rounded-lg px-1.5 py-1 opacity-70" style={style}>
                        {inner}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {single && <p className="border-t border-line px-4 py-2 text-xs text-muted">{capitalize(formatDay(days[0]))} · toca un horario libre para agregar algo.</p>}
    </div>
  );
}

function Chip({ it }: { it: CalItem }) {
  const cls = `block truncate rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-semibold ${it.done ? "line-through opacity-50" : ""}`;
  const style = { background: `color-mix(in srgb, ${it.color} 18%, transparent)` };
  return it.href ? (
    <Link href={it.href} className={cls} style={style}>
      {it.emoji} {it.title}
    </Link>
  ) : (
    <span className={cls} style={style}>
      {it.emoji} {it.title}
    </span>
  );
}
