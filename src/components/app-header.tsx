import Link from "next/link";
import { Logo } from "./logo";

export function AppHeader({ children, userInitial }: { children?: React.ReactNode; userInitial?: string }) {
  return (
    <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Logo href="/mi" />
          {children}
        </div>
        <Link
          href="/perfil"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-fg transition hover:bg-line"
          aria-label="Mi perfil"
        >
          {userInitial ?? "Yo"}
        </Link>
      </div>
    </header>
  );
}
