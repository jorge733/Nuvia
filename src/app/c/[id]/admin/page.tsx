import Link from "next/link";
import { requireManager } from "@/lib/community";
import { inviteLink, qrSvg } from "@/lib/site";
import { Badge, Details, Empty, Field, Flash, PageTitle, SectionHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ROLE_LABEL, fecha } from "@/lib/format";
import {
  addUnits,
  deleteAnnouncement,
  deleteUnit,
  postAnnouncement,
  removeMember,
  rotateCode,
  saveSettings,
  setMemberStatus,
  updateMember,
  updateUnit,
} from "./actions";

type Member = {
  membership_id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string;
  role: string;
  status: string;
  relation: string;
  unit_id: string | null;
  unit_label: string | null;
  created_at: string;
};

const RELATION: Record<string, string> = { propietario: "Propietario/a", arrendatario: "Arrendatario/a", otro: "Residente" };

export default async function Admin({ params, searchParams }: PageProps<"/c/[id]/admin">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, community, isAdmin } = await requireManager(id);

  const [{ data: membersData }, { data: units }, { data: announcements }] = await Promise.all([
    supabase.rpc("member_directory", { cid: id }),
    supabase.from("units").select("id, label, share").eq("community_id", id),
    supabase.from("announcements").select("id, title, created_at").eq("community_id", id).order("created_at", { ascending: false }).limit(10),
  ]);
  const members = (membersData as Member[] | null) ?? [];
  const pending = members.filter((m) => m.status === "pendiente");
  const active = members.filter((m) => m.status === "activo");
  const sortedUnits = (units ?? []).sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true }));
  const occupied = new Set(active.map((m) => m.unit_id));
  const link = await inviteLink(community.invite_code);
  const svg = await qrSvg(link);
  const shareSum = sortedUnits.reduce((s, u) => s + Number(u.share ?? 0), 0);

  return (
    <div>
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
      <PageTitle sub={`${active.length} vecinos activos · ${sortedUnits.length} unidades`}>Administrar</PageTitle>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-1">
          <SectionHeader title="Invitar vecinos" />
          <div className="mx-auto w-44 overflow-hidden rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="mt-3 text-center text-sm text-muted">Código</p>
          <p className="text-center font-mono text-2xl font-bold tracking-widest">{community.invite_code}</p>
          <input className="input mt-3 text-xs" readOnly value={link} aria-label="Enlace de invitación" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/c/${id}/admin/cartel`} className="btn-secondary flex-1" target="_blank">
              🖨️ Imprimir cartel
            </Link>
            <a
              className="btn-wa flex-1"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://wa.me/?text=${encodeURIComponent(`¡Hola vecinos! Ya estamos en Uniluva: gastos comunes, reuniones, documentos y reclamos en un solo lugar. Únete aquí: ${link}`)}`}
            >
              Compartir
            </a>
          </div>
          <form action={rotateCode.bind(null, id)} className="mt-3">
            <SubmitButton className="link text-xs" confirm="El código y el QR actuales dejarán de funcionar. ¿Continuar?" pendingText="…">
              Generar un código nuevo
            </SubmitButton>
          </form>
        </section>

        <section id="vecinos" className="scroll-mt-28 space-y-4 lg:col-span-2">
          {pending.length > 0 && (
            <div className="card border-warn/40">
              <SectionHeader title={`Solicitudes pendientes (${pending.length})`} />
              <ul className="divide-y divide-line">
                {pending.map((m) => (
                  <li key={m.membership_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">{m.full_name || m.email}</p>
                      <p className="text-sm text-muted">
                        {m.unit_label ? `Unidad ${m.unit_label}` : "Sin unidad"} · {RELATION[m.relation]} · {m.email}
                        {m.unit_id && occupied.has(m.unit_id) && <span className="text-warn"> · la unidad ya tiene vecinos activos</span>}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={setMemberStatus.bind(null, id, m.membership_id, "activo")}>
                        <SubmitButton pendingText="…">Aprobar</SubmitButton>
                      </form>
                      <form action={setMemberStatus.bind(null, id, m.membership_id, "rechazado")}>
                        <SubmitButton className="btn-secondary" pendingText="…">
                          Rechazar
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Details summary={`Vecinos activos (${active.length})`} open={pending.length === 0}>
            {active.length === 0 ? (
              <Empty>Aún no hay vecinos activos.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {active.map((m) => (
                  <li key={m.membership_id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {m.full_name || m.email} {m.user_id === user.id && <span className="text-xs text-muted">(tú)</span>}
                        </p>
                        <p className="text-sm text-muted">
                          {m.email}
                          {m.phone ? ` · ${m.phone}` : ""} · {RELATION[m.relation]}
                        </p>
                      </div>
                      <Badge tone={m.role === "residente" ? "neutral" : "accent"}>{ROLE_LABEL[m.role]}</Badge>
                    </div>
                    <form action={updateMember.bind(null, id, m.membership_id)} className="mt-2 flex flex-wrap items-center gap-2">
                      <select className="input w-auto py-1.5 text-sm" name="unit_id" defaultValue={m.unit_id ?? ""} aria-label="Unidad">
                        <option value="">Sin unidad</option>
                        {sortedUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                      {isAdmin && (
                        <select className="input w-auto py-1.5 text-sm" name="role" defaultValue={m.role} aria-label="Rol">
                          <option value="residente">Vecino/a</option>
                          <option value="comite">Comité</option>
                          <option value="admin">Administración</option>
                        </select>
                      )}
                      <SubmitButton className="btn-secondary py-1.5 text-xs" pendingText="…">
                        Guardar
                      </SubmitButton>
                    </form>
                    {m.user_id !== user.id && (
                      <form action={removeMember.bind(null, id, m.membership_id)} className="mt-1">
                        <SubmitButton className="text-xs text-danger hover:underline" confirm={`¿Quitar a ${m.full_name || m.email} de la comunidad?`} pendingText="…">
                          Quitar de la comunidad
                        </SubmitButton>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Details>
        </section>

        <section className="space-y-4 lg:col-span-2">
          <Details summary="Datos de la comunidad y enlaces de WhatsApp">
            <form action={saveSettings.bind(null, id)} className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre">
                <input className="input" name="name" required defaultValue={community.name} maxLength={80} />
              </Field>
              <Field label="Comuna">
                <input className="input" name="comuna" required defaultValue={community.comuna} maxLength={60} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Dirección">
                  <input className="input" name="address" defaultValue={community.address ?? ""} maxLength={160} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Grupo de WhatsApp de la comunidad" hint="En WhatsApp: info del grupo → Invitar mediante enlace. Solo lo verán vecinos aprobados.">
                  <input className="input" name="whatsapp_url" type="url" defaultValue={community.whatsapp_url ?? ""} placeholder="https://chat.whatsapp.com/…" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Grupo de ventas (opcional)">
                  <input className="input" name="sales_whatsapp_url" type="url" defaultValue={community.sales_whatsapp_url ?? ""} placeholder="https://chat.whatsapp.com/…" />
                </Field>
              </div>
              <Field label="Nombre de la administración">
                <input className="input" name="admin_name" defaultValue={community.admin_name ?? ""} maxLength={80} placeholder="Administración Ejemplo Ltda." />
              </Field>
              <Field label="Correo de la administración">
                <input className="input" name="admin_email" type="email" defaultValue={community.admin_email ?? ""} maxLength={120} />
              </Field>
              <Field label="Teléfono de la administración">
                <input className="input" name="admin_phone" type="tel" defaultValue={community.admin_phone ?? ""} maxLength={30} />
              </Field>
              <div className="flex items-end">
                <SubmitButton>Guardar datos</SubmitButton>
              </div>
            </form>
          </Details>

          <Details summary={`Unidades (${sortedUnits.length})`}>
            <form action={addUnits.bind(null, id)} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex-1">
                <span className="label">Agregar unidades</span>
                <input className="input" name="units" placeholder="101-110, 201-210 o 12, 14, 16" />
              </label>
              <SubmitButton>Agregar</SubmitButton>
            </form>
            {sortedUnits.length > 0 && (
              <>
                <p className="hint mt-4">
                  Prorrateo (%) opcional, para repartir el gasto común según la escritura. Suma actual: {shareSum.toFixed(2)}%.
                </p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {sortedUnits.map((u) => (
                    <li key={u.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
                      <span className="w-16 font-medium">{u.label}</span>
                      <form action={updateUnit.bind(null, id, u.id)} className="flex flex-1 items-center gap-1">
                        <input className="input w-20 py-1 text-sm" name="share" inputMode="decimal" defaultValue={u.share ?? ""} placeholder="%" aria-label={`Prorrateo ${u.label}`} />
                        <button className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-2" title="Guardar">
                          ✓
                        </button>
                      </form>
                      <form action={deleteUnit.bind(null, id, u.id)}>
                        <SubmitButton className="rounded-lg px-2 py-1 text-xs text-danger hover:bg-danger-soft" confirm={`¿Eliminar la unidad ${u.label}? Se borrarán sus cobros.`} pendingText="…">
                          ✕
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Details>
        </section>

        <section className="lg:col-span-1">
          <div className="card">
            <SectionHeader title="Publicar aviso" />
            <form action={postAnnouncement.bind(null, id)} className="space-y-3">
              <input className="input" name="title" required maxLength={120} placeholder="Corte de agua el martes" />
              <textarea className="input min-h-24" name="body" required maxLength={4000} placeholder="Aguas Andinas informa un corte programado de 9:00 a 14:00." />
              <SubmitButton className="btn-primary w-full">Publicar aviso</SubmitButton>
            </form>
            {announcements?.length ? (
              <ul className="mt-4 divide-y divide-line text-sm">
                {announcements.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="min-w-0 truncate">
                      {a.title} <span className="text-xs text-muted">· {fecha(a.created_at)}</span>
                    </span>
                    <form action={deleteAnnouncement.bind(null, id, a.id)}>
                      <SubmitButton className="text-xs text-danger hover:underline" confirm="¿Eliminar aviso?" pendingText="…">
                        Eliminar
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
