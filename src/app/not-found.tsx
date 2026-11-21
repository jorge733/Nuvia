import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md space-y-3 p-8 text-center">
      <p className="text-4xl">🧭</p>
      <h1 className="text-xl font-bold">No encontramos esta página</h1>
      <p className="text-muted">Puede que el aporte o la comunidad se haya eliminado.</p>
      <Link href="/" className="btn-primary">
        Volver al inicio
      </Link>
    </div>
  );
}
