"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { addDays, capitalize, formatDay, keyParts, startOfWeek, todayKey } from "@/lib/time";

const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const pad = (n: number) => String(n).padStart(2, "0");

const monthKey = (y: number, m: number) => `${y}-${pad(m)}-01`;
function shiftMonth(key: string, n: number) {
  const { y, m } = keyParts(key);
  const total = y * 12 + (m - 1) + n;
  return monthKey(Math.floor(total / 12), (total % 12) + 1);
}

/** Semanas (lunes a domingo) que cubren el mes de `first`. */
function monthWeeks(first: string) {
  const { m } = keyParts(first);
  const weeks: string[][] = [];
  for (let ws = startOfWeek(first); keyParts(ws).m === m || weeks.length === 0; ws = addDays(ws, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(ws, i)));
  }
  return weeks;
}

/** "Miércoles 25 de noviembre" (con el año solo si no es el actual). */
function longDay(key: string) {
  const sameYear = key.slice(0, 4) === todayKey().slice(0, 4);
  return capitalize(formatDay(key, { weekday: "long", day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) })).replace(",", "");
}

/** Calendario del mes, con el estilo de Uniluva (sin el selector nativo del teléfono). */
export function MonthPicker({ value, onPick, min }: { value: string; onPick: (day: string) => void; min?: string }) {
  const today = todayKey();
  const [month, setMonth] = useState(() => {
    const { y, m } = keyParts(value || today);
    return monthKey(y, m);
  });
  const { m: current } = keyParts(month);

  return (
    <div className="rounded-3xl border border-line bg-surface p-3 sm:max-w-sm">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">
          <ChevronLeft className="size-5" />
        </button>
        <span className="font-display font-semibold">{capitalize(formatDay(month, { month: "long", year: "numeric" }))}</span>
        <button type="button" className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente">
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-muted">
        {LETTERS.map((l, i) => (
          <div key={i} className="py-1.5">
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {monthWeeks(month).flat().map((d) => {
          const { d: num, m } = keyParts(d);
          const selected = d === value;
          const disabled = !!min && d < min;
          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => onPick(d)}
              aria-pressed={selected}
              aria-label={capitalize(formatDay(d))}
              className={`mx-auto grid size-10 place-items-center rounded-full font-display text-sm font-semibold transition disabled:opacity-25 ${
                selected ? "bg-accent text-accent-fg" : d === today ? "text-accent ring-2 ring-accent/30" : "hover:bg-surface-2"
              } ${m !== current && !selected ? "opacity-40" : ""}`}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Campo de fecha: muestra el día elegido y abre el calendario debajo.
 * Envía "YYYY-MM-DD" en un input oculto con `name` (vacío si es opcional y no se eligió).
 */
export function DatePicker({
  name,
  value,
  onChange,
  placeholder = "Elegir fecha",
  min,
  clearable,
  label,
}: {
  name: string;
  value: string;
  onChange: (day: string) => void;
  placeholder?: string;
  min?: string;
  clearable?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="relative">
        <button type="button" className="input flex items-center gap-3 text-left" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={label}>
          <CalendarDays className="size-5 shrink-0 text-muted" />
          <span className={`flex-1 truncate ${value ? "" : "text-muted"}`}>{value ? longDay(value) : placeholder}</span>
        </button>
        {clearable && value && (
          <button
            type="button"
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            aria-label="Quitar fecha"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2">
          <MonthPicker
            value={value}
            min={min}
            onPick={(d) => {
              onChange(d);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
