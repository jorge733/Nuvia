import Link from "next/link";

export function Pager({
  page,
  hasMore,
  params = {},
}: {
  page: number;
  hasMore: boolean;
  params?: Record<string, string | undefined>;
}) {
  if (page === 1 && !hasMore) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && q.set(k, v));
    if (p > 1) q.set("pagina", String(p));
    const s = q.toString();
    return s ? `?${s}` : "?";
  };
  return (
    <nav className="flex justify-between pt-2" aria-label="Paginación">
      {page > 1 ? <Link href={href(page - 1)} className="btn-ghost">← Anteriores</Link> : <span />}
      {hasMore && <Link href={href(page + 1)} className="btn-ghost">Más aportes →</Link>}
    </nav>
  );
}
