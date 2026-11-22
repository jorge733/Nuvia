import { addDays, keyParts, startOfWeek, timeOf } from "./time";

export type CalView = "mes" | "semana" | "dia";

export function parseView(v: unknown): CalView {
  return v === "semana" || v === "dia" ? v : "mes";
}

/** 6 semanas (lunes a domingo) que cubren el mes del día dado. */
export function monthGrid(key: string) {
  const { y, m } = keyParts(key);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const start = startOfWeek(first);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
}

export function shiftMonth(key: string, delta: number) {
  const { y, m } = keyParts(key);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

export const DAY_START = 6; // 06:00
export const DAY_END = 24; // hasta medianoche

export function minutesOf(date: Date) {
  const [h, m] = timeOf(date).split(":").map(Number);
  return h * 60 + m;
}

type Timed = { start: Date; end: Date | null };

/** Posición vertical y columnas para actividades con hora que se superponen en un día. */
export function layoutDay<T extends Timed>(items: T[]) {
  const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime());
  const placed: { item: T; top: number; height: number; col: number; cols: number }[] = [];
  let group: typeof placed = [];
  let groupEnd = -1;
  const colEnds: number[] = [];

  const flush = () => {
    const cols = Math.max(1, ...group.map((g) => g.col + 1));
    group.forEach((g) => (g.cols = cols));
    group = [];
    colEnds.length = 0;
  };

  for (const item of sorted) {
    const s = Math.max(minutesOf(item.start), DAY_START * 60);
    const rawEnd = item.end ? minutesOf(item.end) : minutesOf(item.start) + 60;
    const e = Math.min(Math.max(rawEnd <= s ? s + 30 : rawEnd, s + 30), DAY_END * 60);
    if (group.length && s >= groupEnd) flush();
    let col = colEnds.findIndex((end) => end <= s);
    if (col === -1) col = colEnds.length;
    colEnds[col] = e;
    const p = { item, top: s - DAY_START * 60, height: e - s, col, cols: 1 };
    placed.push(p);
    group.push(p);
    groupEnd = Math.max(groupEnd, e);
  }
  if (group.length) flush();
  return placed;
}
