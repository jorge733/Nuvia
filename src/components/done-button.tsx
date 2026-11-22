"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";

/** Círculo para marcar una actividad como hecha, con un pequeño "pop" al tocarlo. */
export function DoneButton({ done }: { done: boolean }) {
  const { pending } = useFormStatus();
  const [popping, setPopping] = useState(false);
  const shown = pending ? !done : done; // respuesta inmediata mientras se guarda

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={() => setPopping(true)}
      onAnimationEnd={() => setPopping(false)}
      className={`grid size-10 place-items-center rounded-full border-2 transition-colors duration-300 ${popping ? "pop" : ""} ${
        shown ? "border-ok bg-ok text-white" : "border-line text-line hover:border-ok hover:text-ok"
      }`}
    >
      <Check className="size-5" strokeWidth={3} />
      <span className="sr-only">{done ? "Marcar pendiente" : "Marcar hecho"}</span>
    </button>
  );
}
