import Link from "next/link";
import { requireActive } from "@/lib/community";
import { profileNames } from "@/lib/files";
import { Badge, Details, Empty, Field, Flash, PageTitle } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { whatsappLink } from "@/lib/format";
import { addTradesperson, recommend, removeRecommendation } from "./actions";

type Row = {
  id: string;
  name: string;
  category: string;
  category_name: string;
  phone: string;
  comuna: string;
  description: string | null;
  recommendations: number;
  communities: number;
  avg_rating: number;
  recommended_here: boolean;
  recommended_by_me: boolean;
};

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="text-sm" aria-label={`${value} de 5`}>
      <span className="text-warn">{"★".repeat(full)}</span>
      <span className="text-line">{"★".repeat(5 - full)}</span> <span className="text-muted">{value}</span>
    </span>
  );
}

function RatingSelect() {
  return (
    <select className="input" name="rating" required defaultValue="5">
      <option value="5">★★★★★ Excelente</option>
      <option value="4">★★★★ Muy bueno</option>
      <option value="3">★★★ Bueno</option>
      <option value="2">★★ Regular</option>
      <option value="1">★ Malo</option>
    </select>
  );
}

export default async function Oficios({ params, searchParams }: PageProps<"/c/[id]/oficios">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, community } = await requireActive(id);
  const cat = typeof sp.oficio === "string" ? sp.oficio : "";

  const [{ data: rows }, { data: categories }] = await Promise.all([
    supabase.rpc("zone_tradespeople", { cid: id }),
    supabase.from("trade_categories").select("slug, name").order("name"),
  ]);
  const all = (rows as Row[] | null) ?? [];
  const list = cat ? all.filter((r) => r.category === cat) : all;
  const presentCats = (categories ?? []).filter((c) => all.some((r) => r.category === c.slug));

  // Comentarios de vecinos de ESTA comunidad (los de otras comunidades no se muestran).
  const { data: comments } = list.length
    ? await supabase
        .from("trade_recommendations")
        .select("tradesperson_id, user_id, comment, rating")
        .eq("community_id", id)
        .in("tradesperson_id", list.map((r) => r.id))
        .not("comment", "is", null)
    : { data: [] };
  const names = await profileNames(supabase, (comments ?? []).map((c) => c.user_id));

  return (
    <div>
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
      <PageTitle sub={`Recomendados por vecinos verificados de ${community.comuna}. No necesitas ser famoso para ser importante.`}>
        Oficios recomendados
      </PageTitle>

      <div className="mb-6">
        <Details summary="＋ Recomendar a alguien de confianza">
          <form action={addTradesperson.bind(null, id)} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input className="input" name="name" required maxLength={80} placeholder="Juan Pérez" />
            </Field>
            <Field label="Oficio">
              <select className="input" name="category" required defaultValue="">
                <option value="" disabled>
                  Elige un oficio
                </option>
                {(categories ?? []).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Teléfono / WhatsApp">
              <input className="input" name="phone" type="tel" required placeholder="+56 9 1234 5678" />
            </Field>
            <Field label="Tu evaluación">
              <RatingSelect />
            </Field>
            <div className="sm:col-span-2">
              <Field label="¿Qué trabajo te hizo? (opcional)">
                <input className="input" name="comment" maxLength={500} placeholder="Cambió el calefont en una tarde, precio justo y muy ordenado." />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Especialidades (opcional)" hint="Lo verán todos los vecinos de la comuna.">
                <input className="input" name="description" maxLength={500} placeholder="Calefont, filtraciones, instalaciones de gas certificadas (SEC)." />
              </Field>
            </div>
            <label className="flex items-start gap-3 text-sm sm:col-span-2">
              <input type="checkbox" name="consent" required className="mt-0.5 accent-[var(--accent)]" />
              <span>Confirmo que esta persona me autorizó a compartir su nombre y teléfono en Uniluva.</span>
            </label>
            <div>
              <SubmitButton>Publicar recomendación</SubmitButton>
            </div>
          </form>
        </Details>
      </div>

      {presentCats.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto">
          <Link
            href={`/c/${id}/oficios`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${!cat ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg"}`}
          >
            Todos
          </Link>
          {presentCats.map((c) => (
            <Link
              key={c.slug}
              href={`/c/${id}/oficios?oficio=${c.slug}`}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${cat === c.slug ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg"}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <Empty>
          Todavía no hay oficios recomendados en {community.comuna}. ¿Conoces a alguien que trabaje bien? Sé el primero en recomendarlo.
        </Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((t) => {
            const own = (comments ?? []).filter((c) => c.tradesperson_id === t.id);
            return (
              <article key={t.id} className="card flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{t.name}</h3>
                    <p className="text-sm text-muted">{t.category_name}</p>
                  </div>
                  {t.recommended_here && <Badge tone="accent">En tu comunidad</Badge>}
                </div>
                <div className="mt-2">
                  <Stars value={Number(t.avg_rating)} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  Recomendado por {t.recommendations} {t.recommendations === 1 ? "vecino" : "vecinos"}
                  {t.communities > 1 ? ` de ${t.communities} comunidades` : ""}
                </p>
                {t.description && <p className="mt-2 text-sm">{t.description}</p>}
                {own.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {own.slice(0, 3).map((c) => (
                      <li key={c.user_id} className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
                        “{c.comment}” <span className="text-xs text-muted">— {names[c.user_id] ?? "Vecino/a"}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <a
                    href={whatsappLink(t.phone, `Hola ${t.name.split(" ")[0]}, te contacto por recomendación de mis vecinos en Uniluva.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-wa"
                  >
                    WhatsApp
                  </a>
                  <a href={`tel:${t.phone.replace(/\s/g, "")}`} className="btn-secondary">
                    Llamar
                  </a>
                </div>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-muted hover:text-fg">
                    {t.recommended_by_me ? "Editar mi recomendación" : "Yo también lo recomiendo"}
                  </summary>
                  <form action={recommend.bind(null, id, t.id)} className="mt-3 space-y-2">
                    <RatingSelect />
                    <input className="input" name="comment" maxLength={500} placeholder="¿Qué trabajo te hizo? (opcional)" />
                    <div className="flex gap-2">
                      <SubmitButton className="btn-primary">Guardar</SubmitButton>
                    </div>
                  </form>
                  {t.recommended_by_me && (
                    <form action={removeRecommendation.bind(null, id, t.id)} className="mt-2">
                      <SubmitButton className="link text-xs text-danger" pendingText="…">
                        Quitar mi recomendación
                      </SubmitButton>
                    </form>
                  )}
                </details>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
