export function SetupNotice() {
  return (
    <div className="card mx-auto max-w-xl space-y-3 p-6">
      <h1 className="text-xl font-bold">Falta conectar Supabase</h1>
      <p className="text-muted">
        Copia <code>.env.example</code> a <code>.env.local</code> y completa <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
        <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> con los datos de tu proyecto (Supabase → Project Settings → API).
      </p>
      <p className="text-muted">Luego aplica la migración de <code>supabase/migrations</code>. Las instrucciones están en el README.</p>
    </div>
  );
}
