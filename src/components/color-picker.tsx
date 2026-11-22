import { MEMBER_COLORS } from "@/lib/format";

export function ColorPicker({ name, defaultValue }: { name: string; defaultValue: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {Object.entries(MEMBER_COLORS).map(([key, c]) => (
        <label key={key} className="cursor-pointer" title={c.label}>
          <input type="radio" name={name} value={key} defaultChecked={key === defaultValue} className="peer sr-only" />
          <span
            className="block h-8 w-8 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-fg peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
            style={{ background: c.hex }}
          />
          <span className="sr-only">{c.label}</span>
        </label>
      ))}
    </div>
  );
}
