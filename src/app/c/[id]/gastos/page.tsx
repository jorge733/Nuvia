import Link from "next/link";
import { requireActive } from "@/lib/community";
import { signedUrls } from "@/lib/files";
import { Badge, Details, Empty, Field, Flash, PageTitle, SectionHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { CHARGE_STATUS_LABEL, clp, fecha, mes } from "@/lib/format";
import { publishPeriod, reportPayment } from "./actions";

type Charge = {
  id: string;
  amount: number;
  status: string;
  receipt_path: string | null;
  expense_periods: { id: string; period: string; due_date: string | null; notes: string | null; document_path: string | null };
};

export default async function Gastos({ params, searchParams }: PageProps<"/c/[id]/gastos">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, membership, canManage } = await requireActive(id);

  const [{ data: myCharges }, { data: periods }] = await Promise.all([
    membership.unit_id
      ? supabase
          .from("unit_charges")
          .select("id, amount, status, receipt_path, expense_periods(id, period, due_date, notes, document_path)")
          .eq("unit_id", membership.unit_id)
          .returns<Charge[]>()
      : Promise.resolve({ data: [] as Charge[] }),
    canManage
      ? supabase
          .from("expense_periods")
          .select("id, period, total_amount, due_date, unit_charges(status)")
          .eq("community_id", id)
          .order("period", { ascending: false })
          .limit(24)
      : Promise.resolve({ data: null }),
  ]);

  const charges = (myCharges ?? []).sort((a, b) => b.expense_periods.period.localeCompare(a.expense_periods.period));
  const urls = await signedUrls(supabase, charges.flatMap((c) => [c.expense_periods.document_path, c.receipt_path]));
  const nextMonth = new Date();
  nextMonth.setDate(1);
  const defaultMonth = nextMonth.toISOString().slice(0, 7);

  return (
    <div>
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
      <PageTitle sub={membership.units ? `Unidad ${membership.units.label}` : "Sin unidad asignada"}>Gastos comunes</PageTitle>

      {canManage && (
        <div className="mb-8 space-y-4">
          <Details summary="＋ Publicar gasto común del mes">
            <form action={publishPeriod.bind(null, id)} className="grid gap-4 sm:grid-cols-2">
              <Field label="Mes">
                <input className="input" type="month" name="period" required defaultValue={defaultMonth} />
              </Field>
              <Field label="Total a repartir (CLP)">
                <input className="input" name="total" inputMode="numeric" required placeholder="2.450.000" />
              </Field>
              <Field label="Vencimiento">
                <input className="input" type="date" name="due_date" />
              </Field>
              <Field label="Reparto">
                <select className="input" name="mode" defaultValue="igual">
                  <option value="igual">Partes iguales</option>
                  <option value="prorrateo">Según prorrateo de cada unidad</option>
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Liquidación (PDF o imagen, opcional)">
                  <input className="input" type="file" name="document" accept=".pdf,image/*,.xlsx" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Notas para los vecinos (opcional)">
                  <textarea className="input min-h-20" name="notes" maxLength={2000} placeholder="Este mes incluye la mantención del ascensor." />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <SubmitButton pendingText="Publicando…">Publicar y generar cobros</SubmitButton>
              </div>
            </form>
          </Details>

          <section>
            <SectionHeader title="Meses publicados (vista de la directiva)" />
            {periods?.length ? (
              <div className="card divide-y divide-line p-0 sm:p-0">
                {periods.map((p) => {
                  const st = (p.unit_charges as { status: string }[]) ?? [];
                  const paid = st.filter((c) => c.status === "pagado").length;
                  const informed = st.filter((c) => c.status === "informado").length;
                  return (
                    <Link key={p.id} href={`/c/${id}/gastos/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-2">
                      <span className="font-medium">{mes(p.period)}</span>
                      <span className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted">{clp(p.total_amount)}</span>
                        <Badge tone="ok">
                          {paid}/{st.length} pagados
                        </Badge>
                        {informed > 0 && <Badge tone="accent">{informed} por confirmar</Badge>}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Empty>Aún no has publicado gastos comunes.</Empty>
            )}
          </section>
        </div>
      )}

      <SectionHeader title="Mis gastos comunes" />
      {!membership.unit_id ? (
        <Empty>Tu membresía no tiene unidad asignada.</Empty>
      ) : charges.length === 0 ? (
        <Empty>Todavía no hay gastos comunes publicados para tu unidad.</Empty>
      ) : (
        <div className="space-y-3">
          {charges.map((c) => {
            const p = c.expense_periods;
            return (
              <article key={c.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{mes(p.period)}</h3>
                    {p.due_date && <p className="text-sm text-muted">Vence el {fecha(p.due_date)}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{clp(c.amount)}</p>
                    <Badge tone={c.status === "pagado" ? "ok" : c.status === "informado" ? "accent" : "warn"}>{CHARGE_STATUS_LABEL[c.status]}</Badge>
                  </div>
                </div>
                {p.notes && <p className="mt-3 whitespace-pre-line text-sm text-muted">{p.notes}</p>}
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {p.document_path && urls[p.document_path] && (
                    <a className="link" href={urls[p.document_path]} target="_blank" rel="noopener noreferrer">
                      📄 Ver liquidación
                    </a>
                  )}
                  {c.receipt_path && urls[c.receipt_path] && (
                    <a className="link" href={urls[c.receipt_path]} target="_blank" rel="noopener noreferrer">
                      🧾 Mi comprobante
                    </a>
                  )}
                </div>
                {c.status === "pendiente" && (
                  <form action={reportPayment.bind(null, id, c.id)} className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-end">
                    <label className="flex-1">
                      <span className="label">Comprobante de transferencia (opcional)</span>
                      <input className="input" type="file" name="receipt" accept=".pdf,image/*" />
                    </label>
                    <SubmitButton pendingText="Enviando…">Ya pagué</SubmitButton>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
