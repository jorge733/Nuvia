import Link from "next/link";
import { signOut } from "@/app/actions";
import { getUnreadCount, getViewer } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Avatar } from "./Avatar";
import { NavLink } from "./NavLink";

export async function Nav() {
  const { supabase, user, profile } = isSupabaseConfigured
    ? await getViewer()
    : { supabase: null, user: null, profile: null };
  const unread = user && supabase ? await getUnreadCount(supabase, user.id) : 0;

  const items = [
    { href: "/", label: "Inicio", icon: "🏠" },
    { href: "/c", label: "Comunidades", icon: "🫂" },
    ...(user
      ? [
          { href: "/notificaciones", label: "Avisos", icon: "🔔", badge: unread },
          { href: profile ? `/u/${profile.username}` : "/ajustes", label: "Perfil", icon: "👤" },
        ]
      : []),
  ];

  return (
    <>
      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 py-6 pr-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="size-8 rounded-lg" />
          <span className="text-xl font-bold tracking-tight">Uniluva</span>
        </Link>
        {items.map((it) => (
          <NavLink key={it.href} {...it} />
        ))}
        <div className="mt-auto space-y-2 px-3">
          {user && profile ? (
            <>
              <Link href="/ajustes" className="flex items-center gap-2 rounded-xl p-2 hover:bg-soft">
                <Avatar profile={profile} size="sm" />
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-medium">{profile.display_name}</span>
                  <span className="block truncate text-xs text-muted">Ajustes</span>
                </span>
              </Link>
              <form action={signOut}>
                <button className="text-sm text-muted hover:text-danger">Cerrar sesión</button>
              </form>
            </>
          ) : (
            <Link href="/entrar" className="btn-primary w-full">
              Entrar
            </Link>
          )}
          <p className="pt-4 text-xs text-muted">
            <Link href="/terminos" className="hover:underline">Términos</Link> ·{" "}
            <Link href="/privacidad" className="hover:underline">Privacidad</Link> ·{" "}
            <Link href="/normas" className="hover:underline">Normas</Link>
          </p>
        </div>
      </aside>

      {/* Móvil */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/85 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="size-7 rounded-lg" />
          <span className="text-lg font-bold">Uniluva</span>
        </Link>
        {user ? (
          <Link href="/ajustes" aria-label="Ajustes">
            {profile && <Avatar profile={profile} size="sm" />}
          </Link>
        ) : (
          <Link href="/entrar" className="btn-primary py-1.5">
            Entrar
          </Link>
        )}
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {items.map((it) => (
          <NavLink key={it.href} {...it} compact />
        ))}
      </nav>
    </>
  );
}
