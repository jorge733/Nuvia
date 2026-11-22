function Row() {
  return (
    <div className="flex items-start gap-3 px-3 py-4">
      <div className="skeleton h-4 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-2/3 rounded-full" />
        <div className="skeleton h-3 w-1/3 rounded-full" />
      </div>
    </div>
  );
}

/** Esqueleto de carga para las pantallas de agenda. */
export function AgendaSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Cargando">
      <div className="skeleton h-48 rounded-[2rem]" />
      {[3, 2].map((n, i) => (
        <div key={i}>
          <div className="skeleton mb-3 h-5 w-24 rounded-full" />
          <div className="card divide-y divide-line p-1">
            {Array.from({ length: n }, (_, k) => (
              <Row key={k} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
