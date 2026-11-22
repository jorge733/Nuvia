import Link from "next/link";
import type { ReactNode } from "react";
import { CircleCheck, CircleAlert, Plus } from "lucide-react";

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`rise mb-5 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${error ? "bg-danger-soft text-danger" : "bg-ok-soft text-ok"}`}
    >
      {error ? <CircleAlert className="mt-px size-4 shrink-0" /> : <CircleCheck className="mt-px size-4 shrink-0" />}
      <span>{error ?? ok}</span>
    </div>
  );
}

export function PageTitle({ children, action, sub, eyebrow }: { children: ReactNode; action?: ReactNode; sub?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold sm:text-4xl">{children}</h1>
        {sub && <p className="mt-2 max-w-xl text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

const TONES = {
  neutral: "bg-surface-2 text-muted",
  accent: "bg-accent-soft text-accent",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  sun: "bg-sun-soft text-sun",
  danger: "bg-danger-soft text-danger",
} as const;

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}

export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-line px-6 py-10 text-center text-sm text-muted">
      {icon && <div className="text-muted/70">{icon}</div>}
      {children}
    </div>
  );
}

export function SectionHeader({ title, href, linkText = "Ver todo", count }: { title: ReactNode; href?: string; linkText?: string; count?: number }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 px-1">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {title}
        {!!count && <span className="rounded-full bg-surface-2 px-2 py-0.5 font-sans text-xs font-semibold text-muted">{count}</span>}
      </h2>
      {href && (
        <Link href={href} className="text-sm font-semibold text-accent hover:underline">
          {linkText}
        </Link>
      )}
    </div>
  );
}

export function Details({ summary, children, open }: { summary: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details className="card group" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
        {summary}
        <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-muted transition group-open:rotate-45" aria-hidden>
          <Plus className="size-4" />
        </span>
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}
