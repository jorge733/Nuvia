import type { ReactNode } from "react";
import { type CalView, monthGrid, shiftMonth } from "@/lib/calendar";
import { addDays, capitalize, formatDay, keyParts, startOfWeek } from "@/lib/time";
import { CalendarHeader } from "./header";
import { MonthView } from "./month";
import { TimeGrid } from "./time-grid";
import type { CalItem } from "./types";

/** Rango de días que muestra cada vista. */
export function viewRange(view: CalView, anchor: string) {
  if (view === "mes") {
    const weeks = monthGrid(anchor);
    return { first: weeks[0][0], last: weeks[5][6], weeks };
  }
  if (view === "semana") {
    const monday = startOfWeek(anchor);
    return { first: monday, last: addDays(monday, 6), weeks: null };
  }
  return { first: anchor, last: anchor, weeks: null };
}

export function CalendarPage({
  view,
  anchor,
  today,
  nowMinutes,
  items,
  basePath,
  listHref,
  newBase,
  selectedDay,
}: {
  view: CalView;
  anchor: string;
  today: string;
  nowMinutes: number;
  items: CalItem[];
  basePath: string;
  listHref: string;
  newBase: string;
  /** Lista del día elegido (debajo del mes). */
  selectedDay?: ReactNode;
}) {
  const range = viewRange(view, anchor);
  const byDay = new Map<string, CalItem[]>();
  for (const it of items) byDay.set(it.day, [...(byDay.get(it.day) ?? []), it]);
  for (const list of byDay.values()) list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.getTime() - b.start.getTime());

  const href = (v: CalView | "lista", d = anchor) => (v === "lista" ? `${listHref}?d=${d}` : `${basePath}?vista=${v}&d=${d}`);
  const step = (dir: 1 | -1) =>
    view === "mes" ? shiftMonth(anchor, dir) : addDays(anchor, view === "semana" ? 7 * dir : dir);

  const { y, m } = keyParts(anchor);
  const title =
    view === "mes"
      ? capitalize(formatDay(`${y}-${String(m).padStart(2, "0")}-01`, { month: "long" }))
      : view === "semana"
        ? `${formatDay(range.first, { day: "numeric", month: "short" })} – ${formatDay(range.last, { day: "numeric", month: "short" })}`
        : capitalize(formatDay(anchor, { weekday: "long", day: "numeric" }));
  const eyebrow = view === "mes" ? String(y) : capitalize(formatDay(anchor, { month: "long", year: "numeric" }));
  const newHref = (day: string, hour: number) => `${newBase}${newBase.includes("?") ? "&" : "?"}fecha=${day}&hora=${String(hour).padStart(2, "0")}:00`;

  return (
    <div>
      <CalendarHeader
        title={title}
        eyebrow={eyebrow}
        view={view}
        prevHref={href(view, step(-1))}
        nextHref={href(view, step(1))}
        todayHref={href(view, today)}
        viewHref={(v) => href(v)}
      />
      {view === "mes" && range.weeks ? (
        <>
          <MonthView weeks={range.weeks} month={m} today={today} selected={anchor} byDay={byDay} dayHref={(d) => href("mes", d)} />
          {selectedDay}
        </>
      ) : (
        <TimeGrid
          days={view === "semana" ? Array.from({ length: 7 }, (_, i) => addDays(range.first, i)) : [anchor]}
          byDay={byDay}
          today={today}
          nowMinutes={nowMinutes}
          newHref={newHref}
          dayHref={(d) => href("dia", d)}
        />
      )}
    </div>
  );
}
