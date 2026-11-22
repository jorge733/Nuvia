import { ArrowUp, Sparkles } from "lucide-react";
import { quickAdd } from "@/app/f/[id]/actions";
import { SubmitButton } from "./submit-button";

const EXAMPLES = ["Dentista Sofi mañana 16:00", "Sacar la basura cada lunes 21h", "Pagar la luz el 5", "Cumpleaños de la Tata 25 de diciembre"];

/** Barra para agregar escribiendo como se habla. */
export function QuickAdd({ from, spaces, defaultSpace }: { from: string; spaces: { id: string; name: string }[]; defaultSpace: string }) {
  return (
    <form action={quickAdd.bind(null, from)} className="card p-2">
      <div className="flex items-center gap-2">
        <Sparkles className="ml-3 size-5 shrink-0 text-accent" aria-hidden />
        <input
          name="q"
          required
          maxLength={200}
          autoComplete="off"
          enterKeyHint="send"
          className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-muted/70"
          placeholder="Escribe algo como: Dentista mañana 16:00"
          aria-label="Agregar escribiendo, por ejemplo: Dentista Sofi mañana 16:00"
        />
        <SubmitButton className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition active:scale-95" pendingText="…">
          <ArrowUp className="size-5" strokeWidth={2.5} />
          <span className="sr-only">Agregar</span>
        </SubmitButton>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-1 pb-1.5 text-xs text-muted">
        {spaces.length > 1 ? (
          <label className="inline-flex items-center gap-1.5">
            ¿Quién lo ve?
            <select name="space" defaultValue={defaultSpace} className="rounded-full bg-surface-2 px-2.5 py-1 font-semibold text-fg outline-none">
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="space" value={defaultSpace} />
        )}
        <span className="hidden sm:inline">Prueba: “{EXAMPLES[1]}” o “{EXAMPLES[2]}”</span>
      </div>
    </form>
  );
}
