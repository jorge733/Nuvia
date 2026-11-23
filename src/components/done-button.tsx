"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";

/**
 * Círculo para marcar una actividad como hecha, con un pequeño "pop" al tocarlo.
 * Guarda sin navegar: la página se actualiza en su lugar y no salta arriba.
 */
export function DoneButton({ done, action }: { done: boolean; action: () => Promise<string | null> }) {
  const [error, submit, pending] = useActionState(() => action(), null);
  const [popping, setPopping] = useState(false);
  const shown = pending ? !done : done; // respuesta inmediata mientras se guarda

  return (
    <form action={submit} className="relative">
      <button
        type="submit"
        disabled={pending}
        onClick={() => setPopping(true)}
        onAnimationEnd={() => setPopping(false)}
        aria-pressed={done}
        className={`grid size-10 place-items-center rounded-full border-2 transition-colors duration-300 ${popping ? "pop" : ""} ${
          shown ? "border-ok bg-ok text-white" : "border-line text-line hover:border-ok hover:text-ok"
        }`}
      >
        <Check className="size-5" strokeWidth={3} />
        <span className="sr-only">{done ? "Marcar pendiente" : "Marcar hecho"}</span>
      </button>
      {error && !pending && (
        <p role="alert" className="absolute right-0 top-full z-10 mt-1 w-44 rounded-xl bg-danger-soft px-3 py-2 text-xs font-medium text-danger shadow-soft">
          {error}
        </p>
      )}
    </form>
  );
}
