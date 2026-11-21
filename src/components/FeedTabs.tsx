import Link from "next/link";

export function FeedTabs({ mode, base = "/" }: { mode: "utiles" | "recientes"; base?: string }) {
  const tabs = [
    { key: "utiles", label: "Más útiles", href: base, hint: "Lo que más ha ayudado, con prioridad a lo reciente" },
    { key: "recientes", label: "Recientes", href: `${base}?orden=recientes`, hint: "En orden de publicación" },
  ] as const;
  return (
    <div className="flex gap-1 rounded-full border border-line bg-surface p-1 text-sm" role="tablist">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          role="tab"
          aria-selected={mode === t.key}
          title={t.hint}
          className={`flex-1 rounded-full px-4 py-1.5 text-center font-medium transition ${mode === t.key ? "bg-brand text-white" : "text-muted hover:text-fg"}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
