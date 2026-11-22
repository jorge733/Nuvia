import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-5xl" aria-hidden>
        🏘️
      </p>
      <h1 className="mt-4 text-2xl font-bold">No encontramos esta página</h1>
      <p className="mt-2 text-muted">Puede que no exista o que no tengas acceso a esta comunidad.</p>
      <Link href="/inicio" className="btn-primary mt-6">
        Ir al inicio
      </Link>
    </main>
  );
}
