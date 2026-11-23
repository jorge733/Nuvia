"use client";

import { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { RECURRENCE_LABEL, WEEKDAY_LETTER, WEEKDAY_SHORT, isCustomRecurrence, weekDays, weekday } from "@/lib/time";
import { DatePicker } from "./date-picker";

const OPTIONS: [string, string][] = [...Object.entries(RECURRENCE_LABEL), ["custom", "Personalizado"]];
const UNITS: [string, string, string][] = [
  ["diaria", "día", "días"],
  ["semanal", "semana", "semanas"],
  ["mensual", "mes", "meses"],
  ["anual", "año", "años"],
];
const WEEK = [1, 2, 3, 4, 5, 6, 0]; // lunes a domingo

type Initial = { recurrence: string; recur_interval: number; recur_until: string | null; recur_days?: number[] | null };

const pill = (on: boolean) =>
  `shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition ${on ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg hover:bg-line"}`;

/** "Se repite": opciones rápidas o "Personalizado" (cada N días/semanas/meses/años y qué días), y hasta cuándo. */
export function RepeatField({ initial }: { initial?: Initial }) {
  const ref = useRef<HTMLDivElement>(null);
  const custom = !!initial && isCustomRecurrence(initial);
  const [choice, setChoice] = useState(custom ? "custom" : (initial?.recurrence ?? "none"));
  const [unit, setUnit] = useState(custom ? initial!.recurrence : "semanal");
  const [interval, setInterval] = useState(custom ? Math.max(1, initial!.recur_interval) : 1);
  const [days, setDays] = useState<number[]>(custom ? weekDays(initial!.recur_days) : []);
  const [until, setUntil] = useState(initial?.recur_until ?? "");

  /** Fecha elegida arriba en el formulario (para marcar su día de la semana al empezar). */
  const startDate = () => (ref.current?.closest("form")?.elements.namedItem("date") as HTMLInputElement | null)?.value ?? "";

  const pick = (key: string) => {
    setChoice(key);
    if (key === "custom" && !days.length) {
      const d = startDate();
      if (d) setDays([weekday(d)]);
    }
  };
  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? (cur.length > 1 ? cur.filter((x) => x !== d) : cur) : [...cur, d]));

  const unitLabel = UNITS.find((u) => u[0] === unit)!;
  const summary =
    `Cada ${interval === 1 ? unitLabel[1] : `${interval} ${unitLabel[2]}`}` + (unit === "semanal" && days.length ? `: ${weekDays(days).map((d) => WEEKDAY_SHORT[d]).join(", ")}` : "");

  return (
    <div ref={ref} className="space-y-4">
      <fieldset>
        <legend className="label">Se repite</legend>
        <input type="hidden" name="recurrence" value={choice} />
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => pick(key)} aria-pressed={choice === key} className={pill(choice === key)}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {choice === "custom" && (
        <div className="space-y-4 rounded-3xl bg-surface-2 p-4">
          <div>
            <span className="label">Cada</span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-full bg-surface">
                <button type="button" className="grid size-10 place-items-center rounded-full text-muted hover:text-fg disabled:opacity-30" onClick={() => setInterval(Math.max(1, interval - 1))} disabled={interval <= 1} aria-label="Menos">
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center font-display text-lg font-semibold" aria-live="polite">
                  {interval}
                </span>
                <button type="button" className="grid size-10 place-items-center rounded-full text-muted hover:text-fg disabled:opacity-30" onClick={() => setInterval(Math.min(52, interval + 1))} disabled={interval >= 52} aria-label="Más">
                  <Plus className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {UNITS.map(([key, one, many]) => (
                  <button key={key} type="button" onClick={() => setUnit(key)} aria-pressed={unit === key} className={pill(unit === key).replace("bg-surface-2", "bg-surface")}>
                    {interval === 1 ? one : many}
                  </button>
                ))}
              </div>
            </div>
            <input type="hidden" name="recur_unit" value={unit} />
            <input type="hidden" name="recur_interval" value={interval} />
          </div>

          {unit === "semanal" && (
            <fieldset>
              <legend className="label">Los días</legend>
              <div className="grid max-w-sm grid-cols-7 gap-1.5">
                {WEEK.map((d) => {
                  const on = days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      aria-pressed={on}
                      aria-label={WEEKDAY_SHORT[d]}
                      className={`grid aspect-square w-full max-w-10 place-items-center rounded-full font-display text-sm font-semibold transition ${on ? "bg-accent text-accent-fg" : "bg-surface text-fg hover:bg-line"}`}
                    >
                      {WEEKDAY_LETTER[d]}
                    </button>
                  );
                })}
              </div>
              {days.map((d) => (
                <input key={d} type="hidden" name="recur_days" value={d} />
              ))}
            </fieldset>
          )}

          <p className="text-sm font-semibold text-accent">{summary}</p>
        </div>
      )}

      {choice !== "none" && (
        <div>
          <span className="label">Hasta el (opcional)</span>
          <DatePicker name="recur_until" value={until} onChange={setUntil} placeholder="Sin fecha de término" clearable label="Hasta el" />
          <p className="hint">Sin fecha: se repite siempre.</p>
        </div>
      )}
    </div>
  );
}
