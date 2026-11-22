import Link from "next/link";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/community";
import { signedUrls } from "@/lib/files";
import { Badge, Flash, PageTitle } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { CHARGE_STATUS_LABEL, clp, fecha, mes } from "@/lib/format";
import { deletePeriod, setChargeStatus, updateChargeAmount } from "../actions";

type Row = { id: string; amount: number; status: string; receipt_path: string | null; reported_at: string | null; units: { label: string } };

export default async function Periodo({ params, searchParams }: PageProps<"/c/[id]/gastos/[periodId]">) {
  const { id, periodId } = await params;
  const sp = await searchParams;
  const { supabase } = await requireManager(id);

  const [{ data: period }, { data: rows }] = await Promise.all([
    supabase.from("expense_periods").select("*").eq("id", periodId).eq("community_id", id).maybeSingle(),
    supabase.from("unit_charges").select("id, amount, status, receipt_path, reported_at, units(label)").eq("period_id", periodId).returns<Row[]>(),
  ]);
  if (!period) notFound();

  const charges = (rows ?? []).sort((a, b) => a.units.label.localeCompare(b.units.label, "es", { numeric: true }));
  const urls = await signedUrls(supabase, [period.document_path, ...charges.map((c) => c.receipt_path)]);
  const sum = charges.reduce((s, c) => s + Number(c.amount), 0);
  const collected = charges.filter((c) => c.status === "pagado").reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div>
      <Link href={`/c/${id}/gastos`} className="link text-sm">
        ← Gastos comunes
      </Link>
      <div className="mt-3">
        <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
      </div>
      <PageTitle
        sub={`Total ${clp(period.total_amount)}${period.due_date ? ` · vence ${fecha(period.due_date)}` : ""}`}
        action={
          period.document_path && urls[period.document_path] ? (
            <a className="btn-secondary" href={urls[period.document_path]} target="_blank" rel="noopener noreferrer">
              📄 Liquidación
            </a>
          ) : undefined
        }
      >
        {mes(period.period)}
      </PageTitle>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card">
          <p className="text-xs text-muted">Recaudado</p>
          <p className="text-xl font-bold">{clp(collected)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted">Por cobrar</p>
          <p className="text-xl font-bold">{clp(sum - collected)}</p>
        </div>
        <div className="card col-span-2 sm:col-span-1">
          <p className="text-xs text-muted">Suma de cobros</p>
          <p className={`text-xl font-bold ${sum !== Number(period.total_amount) ? "text-warn" : ""}`}>{clp(sum)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Unidad</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {charges.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 font-medium">{c.units.label}</td>
                <td className="px-4 py-2">
                  <form action={updateChargeAmount.bind(null, id, periodId, c.id)} className="flex items-center gap-1">
                    <input className="input w-28 py-1.5 text-sm" name="amount" inputMode="numeric" defaultValue={c.amount} aria-label={`Monto ${c.units.label}`} />
                    <button className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-2" title="Guardar monto">
                      ✓
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-col items-start gap-1">
                    <Badge tone={c.status === "pagado" ? "ok" : c.status === "informado" ? "accent" : "warn"}>{CHARGE_STATUS_LABEL[c.status]}</Badge>
                    {c.receipt_path && urls[c.receipt_path] && (
                      <a className="link text-xs" href={urls[c.receipt_path]} target="_blank" rel="noopener noreferrer">
                        Ver comprobante
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  {c.status === "pagado" ? (
                    <form action={setChargeStatus.bind(null, id, periodId, c.id, "pendiente")}>
                      <SubmitButton className="btn-secondary py-1.5 text-xs" pendingText="…">
                        Deshacer
                      </SubmitButton>
                    </form>
                  ) : (
                    <form action={setChargeStatus.bind(null, id, periodId, c.id, "pagado")}>
                      <SubmitButton className="btn-primary py-1.5 text-xs" pendingText="…">
                        Confirmar pago
                      </SubmitButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={deletePeriod.bind(null, id, periodId)} className="mt-8">
        <SubmitButton className="btn-danger" confirm="¿Eliminar este gasto común y todos sus cobros? No se puede deshacer." pendingText="Eliminando…">
          Eliminar este mes
        </SubmitButton>
      </form>
    </div>
  );
}
