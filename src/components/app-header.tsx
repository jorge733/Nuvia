import Link from "next/link";

export function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/inicio" className="shrink-0 text-lg font-bold tracking-tight">
            Uniluva<span className="text-accent">.</span>
          </Link>
          {children}
        </div>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/perfil" className="rounded-lg px-3 py-2 text-muted hover:bg-surface-2 hover:text-fg">
            Mi perfil
          </Link>
          <form action="/auth/salir" method="post">
            <button className="rounded-lg px-3 py-2 text-muted hover:bg-surface-2 hover:text-fg">Salir</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
