import { requireActive } from "@/lib/community";
import { signedUrls } from "@/lib/files";
import { Details, Empty, Field, Flash, PageTitle, SectionHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { DOC_CATEGORY_LABEL, fecha } from "@/lib/format";
import { deleteDocument, uploadDocument } from "./actions";

export default async function Documentos({ params, searchParams }: PageProps<"/c/[id]/documentos">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, canManage } = await requireActive(id);

  const { data } = await supabase
    .from("documents")
    .select("id, title, category, file_path, created_at")
    .eq("community_id", id)
    .order("created_at", { ascending: false });
  const docs = data ?? [];
  const urls = await signedUrls(supabase, docs.map((d) => d.file_path));
  const groups = Object.keys(DOC_CATEGORY_LABEL)
    .map((cat) => ({ cat, items: docs.filter((d) => d.category === cat) }))
    .filter((g) => g.items.length);

  return (
    <div>
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
      <PageTitle sub="Reglamento, actas, presupuestos y contratos de la comunidad.">Documentos</PageTitle>

      {canManage && (
        <div className="mb-8">
          <Details summary="＋ Subir documento">
            <form action={uploadDocument.bind(null, id)} className="grid gap-4 sm:grid-cols-2">
              <Field label="Título">
                <input className="input" name="title" required maxLength={120} placeholder="Reglamento de copropiedad" />
              </Field>
              <Field label="Categoría">
                <select className="input" name="category" defaultValue="reglamento">
                  {Object.entries(DOC_CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Archivo" hint="PDF, imagen, Word o Excel. Máximo 4 MB.">
                  <input className="input" type="file" name="file" required accept=".pdf,image/*,.docx,.xlsx" />
                </Field>
              </div>
              <div>
                <SubmitButton pendingText="Subiendo…">Publicar documento</SubmitButton>
              </div>
            </form>
          </Details>
        </div>
      )}

      {groups.length === 0 ? (
        <Empty>Aún no hay documentos publicados.</Empty>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.cat}>
              <SectionHeader title={DOC_CATEGORY_LABEL[g.cat]} />
              <ul className="card divide-y divide-line p-0 sm:p-0">
                {g.items.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <a href={urls[d.file_path]} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 hover:text-accent">
                      <span className="block truncate font-medium">📄 {d.title}</span>
                      <span className="text-xs text-muted">{fecha(d.created_at)}</span>
                    </a>
                    {canManage && (
                      <form action={deleteDocument.bind(null, id, d.id)}>
                        <SubmitButton className="rounded-lg px-2 py-1 text-xs text-danger hover:bg-danger-soft" confirm={`¿Eliminar "${d.title}"?`} pendingText="…">
                          Eliminar
                        </SubmitButton>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
