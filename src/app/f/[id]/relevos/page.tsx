import { redirect } from "next/navigation";
import Link from "next/link";
import { HandHeart } from "lucide-react";
import { getFamily } from "@/lib/family";
import { addDays, dayKey, formatWhen, shortDay, startOfDay, todayKey } from "@/lib/time";
import { loadAgenda } from "@/lib/agenda";
import { Empty, Flash, PageTitle, SectionHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MemberAvatar } from "@/components/member-avatar";
import { OccurrenceRow } from "@/components/occurrence-row";
import { takeRelief } from "../actions";

export const metadata = { title: "Relevos" };

type Row = {
  id: string;
  occurrence_start: string;
  requested_by: string | null;
  taken_by: string | null;
  reason: string | null;
  resolved_at: string | null;
  events: { id: string; title: string; all_day: boolean } | null;
};

export default async function Relevos({ params, searchParams }: PageProps<"/f/[id]/relevos">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, me, byId, family } = await getFamily(id);
  if (family.is_personal) redirect("/mi");
  const today = todayKey();
  const self = `/f/${id}/relevos`;

  const [upcoming, { data: history }] = await Promise.all([
    loadAgenda(supabase, id, new Date(), startOfDay(addDays(today, 60))),
    supabase
      .from("relief_requests")
      .select("id, occurrence_start, requested_by, taken_by, reason, resolved_at, events(id, title, all_day)")
      .eq("family_id", id)
      .eq("status", "tomado")
      .not("requested_by", "is", null)
      .gte("resolved_at", startOfDay(addDays(today, -30)).toISOString())
      .order("resolved_at", { ascending: false })
      .limit(30)
      .returns<Row[]>(),
  ]);
  const open = upcoming.filter((o) => o.relief?.status === "abierto");

  // Quién ha tomado más relevos en el último mes (reconocimiento, no competencia).
  const thanks = new Map<string, number>();
  for (const r of history ?? []) if (r.taken_by) thanks.set(r.taken_by, (thanks.get(r.taken_by) ?? 0) + 1);

  return (
    <div>
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
      <PageTitle sub="Cuando alguien no puede, otro toma la posta. Así nadie carga solo con todo.">Relevos</PageTitle>

      <SectionHeader title="Pendientes" />
      {open.length ? (
        <div className="stagger card divide-y divide-line p-1">
          {open.map((o) => (
            <div key={o.key}>
              <OccurrenceRow
                familyId={id}
                o={o}
                byId={byId}
                showDay={shortDay(o.day, today)}
                action={
                  o.relief!.requested_by !== me.id ? (
                    <form action={takeRelief.bind(null, id, o.relief!.id, self)}>
                      <SubmitButton className="btn-sun min-h-9 px-4 py-1.5 text-xs" pendingText="…">
                        Yo voy
                      </SubmitButton>
                    </form>
                  ) : (
                    <span className="pt-1 text-xs text-muted">Lo pediste tú</span>
                  )
                }
              />
              {o.relief!.reason && <p className="-mt-1 px-4 pb-3 pl-[6.5rem] text-sm text-muted">“{o.relief!.reason}”</p>}
            </div>
          ))}
        </div>
      ) : (
        <Empty icon={<HandHeart className="size-8" />}>No hay relevos pendientes. Todo está cubierto.</Empty>
      )}

      {thanks.size > 0 && (
        <section className="mt-8">
          <SectionHeader title="Gracias este mes" />
          <div className="flex flex-wrap gap-3">
            {[...thanks.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([mid, n]) => (
                <div key={mid} className="card flex items-center gap-3 py-3">
                  <MemberAvatar member={byId[mid]} size={32} />
                  <div>
                    <p className="font-semibold">{byId[mid]?.name ?? "Alguien"}</p>
                    <p className="text-xs text-muted">
                      tomó {n} {n === 1 ? "relevo" : "relevos"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <SectionHeader title="Últimos 30 días" />
        {history?.length ? (
          <ul className="stagger card divide-y divide-line p-1">
            {history.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <MemberAvatar member={r.taken_by ? byId[r.taken_by] : null} size={28} />
                <div className="min-w-0 flex-1">
                  <p>
                    <strong>{(r.taken_by && byId[r.taken_by]?.name) || "Alguien"}</strong> tomó el relevo de{" "}
                    <strong>{(r.requested_by && byId[r.requested_by]?.name) || "alguien"}</strong>
                  </p>
                  {r.events && (
                    <Link href={`/f/${id}/e/${r.events.id}?o=${encodeURIComponent(new Date(r.occurrence_start).toISOString())}`} className="truncate text-muted hover:text-accent">
                      {r.events.title} · {formatWhen(new Date(r.occurrence_start), r.events.all_day)}
                    </Link>
                  )}
                </div>
                {r.resolved_at && <span className="shrink-0 text-xs text-muted">{shortDay(dayKey(new Date(r.resolved_at)), today)}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Todavía no hay relevos tomados.</Empty>
        )}
      </section>
    </div>
  );
}
