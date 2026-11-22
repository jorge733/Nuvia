import Link from "next/link";
import type { ReactNode } from "react";

export function Legal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/" className="text-xl font-bold tracking-tight">
        Uniluva<span className="text-accent">.</span>
      </Link>
      <h1 className="mt-8 text-3xl font-bold tracking-tight">{title}</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-muted [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg [&_strong]:text-fg">
        {children}
      </div>
    </main>
  );
}
