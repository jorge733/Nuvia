import Link from "next/link";
import { getCommunity } from "@/lib/community";
import { Badge, Empty, Flash, SectionHeader } from "@/components/ui";
import { CHARGE_STATUS_LABEL, KIND_LABEL, TICKET_STATUS_LABEL, clp, fecha, fechaHora, mes } from "@/lib/format";

export default async function Resumen({ params, searchParams }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, community, membership, active, canManage } = await getCommunity(id);
  const flash = <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />;

  if (!active) {
    return (
      <div className="mx-auto max-w-md py-8 text-center">
        {flash}
        <div className="mb-4 text-4xl" aria-hidden>
          ⏳
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {membership.status === "rechazado" ? "Solicitud no aprobada" : "Solicitud enviada"}
        </h1>
        <p className="mt-2 text-muted">
          {membership.status === "rechazado"
            ? `La administración de ${community.name} no aprobó tu solicitud. Si crees que es un error, contáctala directamente.`
            : `La administración de ${community.name} debe aprobar tu ingreso${membership.units ? ` como ${membership.units.label}` : ""}. Te avisaremos apenas lo haga.`}
        </p>
        <Link href="/inicio?lista=1" className="btn-secondary mt-6">
          Volver a mis comunidades
        </Link>
      </div>
    );
  }

  const nowIso = new Date().toISOString();
  const [charges, meeting, announcements, tickets, pending] = await Promise.all([
    membership.unit_id
      ? supabase
          .from("unit_charges")
          .select("id, amount, status, expense_periods(period, due_date)")
          .eq("unit_id", membership.unit_id)
          .neq("status", "pagado")
          .returns<{ id: string; amount: number; status: string; expense_periods: { period: string; due_date: string | null } }[]>()
      : Promise.resolve({ data: [] }),
    supabase
      .from("meetings")
      .select("id, title, starts_at, location, online_url")
      .eq("community_id", id)
      .gte("starts_at", nowIso)
      .order("starts_at")
      .limit(1)
      .maybeSingle(),
    supabase.from("announcements").select("id, title, body, created_at").eq("community_id", id).order("created_at", { ascending: false }).limit(3),
    supabase
      .from("tickets")
      .select("id, title, status, kind")
      .eq("community_id", id)
      .eq("author_id", user.id)
      .in("status", ["abierto", "en_revision"])
      .order("updated_at", { ascending: false })
      .limit(3),
    canManage
      ? supabase.from("memberships").select("id", { count: "exact", head: true }).eq("community_id", id).eq("status", "pendiente")
      : Promise.resolve({ count: 0 }),
  ]);

  const owed = (charges.data ?? []).sort((a, b) => a.expense_periods.period.localeCompare(b.expense_periods.period));
  const totalOwed = owed.filter((c) => c.status === "pendiente").reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div>
      {flash}
      <div className="mb-6">
        <p className="text-sm text-muted">
          {KIND_LABEL[community.kind]} · {community.comuna}
          {membership.units ? ` · ${membership.units.label}` : ""}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{community.name}</h1>
      </div>

      {canManage && (pending.count ?? 0) > 0 && (
        <Link href={`/c/${id}/admin#vecinos`} className="mb-4 flex items-center justify-between rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
          <span>
            <strong>{pending.count}</strong> {pending.count === 1 ? "vecino espera" : "vecinos esperan"} tu aprobación
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <SectionHeader title="Gasto común" href={`/c/${id}/gastos`} linkText="Historial" />
          {!membership.unit_id ? (
            <p className="text-sm text-muted">Tu membresía no tiene una unidad asignada. Pídele a la administración que la asigne.</p>
          ) : owed.length === 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden>
                ✅
              </span>
              <p className="font-medium">Estás al día.</p>
            </div>
          ) : (
            <div>
              {totalOwed > 0 && (
                <p className="text-3xl font-bold tracking-tight">
                  {clp(totalOwed)} <span className="text-base font-normal text-muted">por pagar</span>
                </p>
              )}
              <ul className="mt-3 divide-y divide-line">
                {owed.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span>
                      {mes(c.expense_periods.period)}
                      {c.expense_periods.due_date && <span className="text-muted"> · vence {fecha(c.expense_periods.due_date)}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <strong>{clp(c.amount)}</strong>
                      <Badge tone={c.status === "informado" ? "accent" : "warn"}>{CHARGE_STATUS_LABEL[c.status]}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
              <Link href={`/c/${id}/gastos`} className="btn-primary mt-3">
                Ver detalle e informar pago
              </Link>
            </div>
          )}
        </section>

        <section className="card">
          <SectionHeader title="Próxima reunión" href={`/c/${id}/reuniones`} />
          {meeting.data ? (
            <div>
              <p className="font-semibold">{meeting.data.title}</p>
              <p className="mt-1 text-sm capitalize">{fechaHora(meeting.data.starts_at)}</p>
              {meeting.data.location && <p className="text-sm text-muted">{meeting.data.location}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/c/${id}/reuniones#r-${meeting.data.id}`} className="btn-secondary">
                  Ver tabla
                </Link>
                <a href={`/c/${id}/reuniones/${meeting.data.id}/ics`} className="btn-secondary">
                  📅 Calendario
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">No hay reuniones agendadas.</p>
          )}
        </section>

        <section className="card">
          <SectionHeader title="Chats de la comunidad" />
          <div className="flex flex-col gap-2">
            {community.whatsapp_url ? (
              <a href={community.whatsapp_url} target="_blank" rel="noopener noreferrer" className="btn-wa">
                💬 Grupo de la comunidad
              </a>
            ) : (
              <p className="text-sm text-muted">Aún no hay grupo de WhatsApp vinculado.</p>
            )}
            {community.sales_whatsapp_url && (
              <a href={community.sales_whatsapp_url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                🛒 Grupo de ventas
              </a>
            )}
          </div>
        </section>

        <section className="card">
          <SectionHeader title="Administración" />
          {community.admin_name || community.admin_email || community.admin_phone ? (
            <div className="space-y-1 text-sm">
              {community.admin_name && <p className="font-semibold">{community.admin_name}</p>}
              {community.admin_email && (
                <p>
                  <a className="link" href={`mailto:${community.admin_email}`}>
                    {community.admin_email}
                  </a>
                </p>
              )}
              {community.admin_phone && (
                <p>
                  <a className="link" href={`tel:${community.admin_phone.replace(/\s/g, "")}`}>
                    {community.admin_phone}
                  </a>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Sin datos de contacto publicados.</p>
          )}
          <Link href={`/c/${id}/reclamos/nuevo?tipo=consulta_admin`} className="btn-secondary mt-3 w-full">
            ✉️ Escribir a la administración
          </Link>
        </section>

        <section className="card">
          <SectionHeader title="Mis casos abiertos" href={`/c/${id}/reclamos`} />
          {tickets.data?.length ? (
            <ul className="space-y-2 text-sm">
              {tickets.data.map((t) => (
                <li key={t.id}>
                  <Link href={`/c/${id}/reclamos/${t.id}`} className="flex items-center justify-between gap-2 hover:text-accent">
                    <span className="truncate">{t.title}</span>
                    <Badge tone={t.status === "en_revision" ? "accent" : "neutral"}>{TICKET_STATUS_LABEL[t.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No tienes reclamos ni consultas abiertas.</p>
          )}
          <Link href={`/c/${id}/reclamos/nuevo`} className="btn-secondary mt-3 w-full">
            Nuevo reclamo o sugerencia
          </Link>
        </section>

        <section className="lg:col-span-3">
          <SectionHeader title="Avisos" />
          {announcements.data?.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {announcements.data.map((a) => (
                <article key={a.id} className="card">
                  <p className="text-xs text-muted">{fecha(a.created_at)}</p>
                  <h3 className="mt-1 font-semibold">{a.title}</h3>
                  <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-muted">{a.body}</p>
                </article>
              ))}
            </div>
          ) : (
            <Empty>No hay avisos publicados.</Empty>
          )}
        </section>

        <Link href={`/c/${id}/oficios`} className="card flex items-center justify-between gap-3 bg-accent-soft hover:border-accent lg:col-span-3">
          <div>
            <p className="font-semibold">🔧 ¿Necesitas un gásfiter, electricista o cerrajero?</p>
            <p className="text-sm text-muted">Mira los oficios que recomiendan tus vecinos en {community.comuna}.</p>
          </div>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
