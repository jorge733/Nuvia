"use client";

import { useState } from "react";

type Chip = { key: string; label: string };

/** Fecha con botones rápidos (Hoy, Mañana, próximos días) y selector completo. */
export function DateField({ defaultValue, chips }: { defaultValue: string; chips: Chip[] }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div>
      <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setValue(c.key)}
            aria-pressed={value === c.key}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
              value === c.key ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg hover:bg-line"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <input className="input" type="date" name="date" required value={value} onChange={(e) => setValue(e.target.value)} aria-label="Fecha" />
    </div>
  );
}
