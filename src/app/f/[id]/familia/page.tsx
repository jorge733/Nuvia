import { redirect } from "next/navigation";
import { getFamily } from "@/lib/family";
import { siteUrl, qrSvg } from "@/lib/site";
import { KIND_LABEL, whatsappShare } from "@/lib/format";
import { Badge, Details, Field, Flash, PageTitle, SectionHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MemberAvatar } from "@/components/member-avatar";
import { ColorPicker } from "@/components/color-picker";
import { addMember, leaveFamily, removeMember, renameFamily, rotateCode, updateMember } from "./actions";

export const metadata = { title: "Familia" };

export default async function Familia({ params, searchParams }: PageProps<"/f/[id]/familia">) {
  const { id } = await params;
  const sp = await searchParams;
  const { family, members, me, isAdmin } = await getFamily(id);
  if (family.is_personal) redirect("/mi");
  const link = `${await siteUrl()}/unirse?codigo=${family.invite_code}`;
  const svg = await qrSvg(link);
  const open = members.filter((m) => !m.user_id && m.kind !== "mascota" && m.kind !== "nino");

  return (
    <div>
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
      <PageTitle eyebrow="Tu familia" sub={`${members.length} ${members.length === 1 ? "integrante" : "integrantes"}. Todos cuentan, usen o no la app.`}>
        {family.name}
      </PageTitle>

      {/* En PC: integrantes a la izquierda; invitar y ajustes, a la derecha. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-8">
        <section className="mb-8">
          <SectionHeader title="Integrantes" />
          <ul className="stagger space-y-2">
            {members.map((m) => (
              <li key={m.id}>
                <details className="card group p-0">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
                    <MemberAvatar member={m} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {m.name} {m.id === me.id && <span className="text-xs font-normal text-muted">(tú)</span>}
                      </p>
                      <p className="text-xs text-muted">
                        {KIND_LABEL[m.kind]} · {m.user_id ? "Usa la app" : "Sin cuenta"}
                      </p>
                    </div>
                    {m.role === "admin" && m.user_id && <Badge tone="accent">Admin</Badge>}
                    <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-muted transition group-open:rotate-45" aria-hidden>
                      ＋
                    </span>
                  </summary>
                  <div className="border-t border-line px-5 py-5">
                    <form action={updateMember.bind(null, id, m.id)} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Nombre">
                          <input className="input" name="name" required maxLength={40} defaultValue={m.name} />
                        </Field>
                        <Field label="Tipo">
                          <select className="input" name="kind" defaultValue={m.kind}>
                            {Object.entries(KIND_LABEL).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      {m.kind !== "mascota" && (
                        <Field label="Teléfono (opcional)" hint="Para enviarle recordatorios por WhatsApp más adelante.">
                          <input className="input" name="phone" type="tel" maxLength={30} defaultValue={m.phone ?? ""} placeholder="+56 9 1234 5678" />
                        </Field>
                      )}
                      <div>
                        <span className="label">Color</span>
                        <ColorPicker name="color" defaultValue={m.color} />
                      </div>
                      {isAdmin && m.user_id && m.id !== me.id && (
                        <Field label="Rol">
                          <select className="input" name="role" defaultValue={m.role}>
                            <option value="miembro">Miembro</option>
                            <option value="admin">Administrador/a (puede invitar y cambiar roles)</option>
                          </select>
                        </Field>
                      )}
                      <SubmitButton className="btn-secondary">Guardar</SubmitButton>
                    </form>
                    {m.id !== me.id && (!m.user_id || isAdmin) && (
                      <form action={removeMember.bind(null, id, m.id)} className="mt-3">
                        <SubmitButton className="text-sm text-danger hover:underline" confirm={`¿Quitar a ${m.name} de la familia?`} pendingText="…">
                          Quitar de la familia
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>

          <div className="mt-3">
            <Details summary="Agregar integrante sin cuenta">
              <p className="-mt-2 mb-4 text-sm text-muted">Niños, abuelos o mascotas: aparecen en la agenda aunque no usen la app.</p>
              <form action={addMember.bind(null, id)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre">
                    <input className="input" name="name" required maxLength={40} placeholder="Ej: Sofi" />
                  </Field>
                  <Field label="Tipo">
                    <select className="input" name="kind" defaultValue="nino">
                      {Object.entries(KIND_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div>
                  <span className="label">Color</span>
                  <ColorPicker name="color" defaultValue="verde" />
                </div>
                <SubmitButton>Agregar</SubmitButton>
              </form>
            </Details>
          </div>
        </section>

        <div className="lg:sticky lg:top-36">
          <section className="card mb-8">
            <SectionHeader title="Invitar a la familia" />
            <p className="text-sm text-muted">
              Envía este enlace a los adultos de tu familia. Al abrirlo podrán elegir su perfil
              {open.length ? ` (${open.map((m) => m.name).join(", ")})` : ""} o crear uno nuevo.
            </p>
            <div className="mt-4 grid items-center gap-4 sm:grid-cols-[160px_1fr] lg:grid-cols-1">
              <div className="mx-auto w-40 overflow-hidden rounded-2xl bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
              <div className="space-y-3">
                <a
                  className="btn-wa w-full"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={whatsappShare(`Te invito a la agenda de ${family.name} en Uniluva, para organizarnos y repartirnos las cosas de la casa 💜 ${link}`)}
                >
                  Invitar por WhatsApp
                </a>
                <input className="input text-xs" readOnly value={link} aria-label="Enlace de invitación" />
                <p className="text-sm">
                  Código: <span className="font-mono font-bold tracking-widest">{family.invite_code}</span>
                </p>
              </div>
            </div>
            {isAdmin && (
              <form action={rotateCode.bind(null, id)} className="mt-3">
                <SubmitButton className="link text-xs" confirm="El enlace actual dejará de funcionar. ¿Continuar?" pendingText="…">
                  Crear un enlace nuevo
                </SubmitButton>
              </form>
            )}
          </section>

          {isAdmin && (
            <Details summary="Nombre de la familia">
              <form action={renameFamily.bind(null, id)} className="flex flex-col gap-2 sm:flex-row">
                <input className="input flex-1" name="name" required maxLength={60} defaultValue={family.name} aria-label="Nombre de la familia" />
                <SubmitButton>Guardar</SubmitButton>
              </form>
            </Details>
          )}

          <form action={leaveFamily.bind(null, id)} className="mt-8">
            <SubmitButton className="btn-danger" confirm="¿Salir de esta familia? Dejarás de ver su agenda." pendingText="…">
              Salir de la familia
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
