import Link from "next/link";
import { getFamily } from "@/lib/family";
import { loadAgenda } from "@/lib/agenda";
import { CATEGORIES, MEMBER_COLORS } from "@/lib/format";
import { addDays, formatDay, isDayKey, startOfDay, startOfWeek, todayKey } from "@/lib/time";
import { Empty, PageTitle } from "@/components/ui";
import { MemberAvatar } from "@/components/member-avatar";

export const metadata = { title: "Balance del hogar" };

export default async function Balance({ params, searchParams }: PageProps<"/f/[id]/balance">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, members } = await getFamily(id);

  const today = todayKey();
  const monday = startOfWeek(isDayKey(sp.d) ? sp.d : today);
  const from = startOfDay(monday);
  const to = startOfDay(addDays(monday, 7));
  const [list, { data: reliefs }] = await Promise.all([
    loadAgenda(supabase, id, from, to),
    supabase
      .from("relief_requests")
      .select("taken_by, requested_by")
      .eq("family_id", id)
      .eq("status", "tomado")
      .not("requested_by", "is", null)
      .gte("occurrence_start", from.toISOString())
      .lt("occurrence_start", to.toISOString()),
  ]);

  // Solo lo compartido con la familia cuenta para el balance.
  const shared = list.filter((o) => o.event.visibility === "familia" && !o.event.masked);
  const total = shared.length;
  const people = members.filter((m) => m.kind !== "mascota");
  const stats = people
    .map((m) => {
      const mine = shared.filter((o) => o.responsibleId === m.id);
      const cats = new Map<string, number>();
      for (const o of mine) cats.set(o.event.category, (cats.get(o.event.category) ?? 0) + 1);
      return {
        member: m,
        count: mine.length,
        done: mine.filter((o) => o.done).length,
        share: total ? mine.length / total : 0,
        reliefsTaken: (reliefs ?? []).filter((r) => r.taken_by === m.id).length,
        topCats: [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
      };
    })
    .sort((a, b) => b.count - a.count);
  const unassigned = shared.filter((o) => !o.responsibleId).length;
  const top = stats[0];
  const adultsWithItems = stats.filter((s) => s.member.kind !== "nino");
  const uneven = total >= 5 && top && top.share > 0.6 && adultsWithItems.length > 1;
  const q = (d: string) => `/f/${id}/balance?d=${d}`;

  return (
    <div>
      <PageTitle sub="Lo que cada uno organiza, lleva o resuelve esta semana. Todo lo que haces cuenta.">Balance del hogar</PageTitle>

      <div className="mb-5 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Semana del {formatDay(monday, { day: "numeric", month: "long" })}
        </p>
        <div className="flex gap-1">
          <Link href={q(addDays(monday, -7))} className="btn-secondary px-3" aria-label="Semana anterior">
            ←
          </Link>
          <Link href={q(today)} className="btn-secondary px-3">
            Esta
          </Link>
          <Link href={q(addDays(monday, 7))} className="btn-secondary px-3" aria-label="Semana siguiente">
            →
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <Empty>No hay actividades familiares esta semana.</Empty>
      ) : (
        <>
          {uneven && (
            <div className="mb-4 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
              <strong>{top.member.name}</strong> está organizando {Math.round(top.share * 100)}% de la semana. ¿Alguien puede tomar algo? 💜
            </div>
          )}
          {!uneven && total >= 5 && (
            <div className="mb-4 rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">La semana está bien repartida. ¡Buen trabajo en equipo! 🙌</div>
          )}

          <div className="card space-y-5">
            {stats.map((s) => {
              const hex = MEMBER_COLORS[s.member.color]?.hex ?? MEMBER_COLORS.gris.hex;
              return (
                <div key={s.member.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 font-medium">
                      <MemberAvatar member={s.member} size={28} />
                      {s.member.name}
                    </span>
                    <span className="text-sm tabular-nums">
                      <strong>{s.count}</strong> <span className="text-muted">· {Math.round(s.share * 100)}%</span>
                    </span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${s.member.name}: ${Math.round(s.share * 100)}%`}>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(s.share * 100, s.count ? 3 : 0)}%`, background: hex }} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    {s.count > 0 && (
                      <span>
                        {s.done} de {s.count} hechas
                      </span>
                    )}
                    {s.topCats.length > 0 && <span>{s.topCats.map(([c, n]) => `${CATEGORIES[c]?.emoji ?? ""} ${n}`).join("  ")}</span>}
                    {s.reliefsTaken > 0 && (
                      <span className="font-medium text-accent">
                        🙋 tomó {s.reliefsTaken} {s.reliefsTaken === 1 ? "relevo" : "relevos"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {unassigned > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
                <span className="flex items-center gap-2">
                  <MemberAvatar member={null} size={24} /> Sin responsable
                </span>
                <Link href={`/f/${id}`} className="font-semibold underline-offset-2 hover:underline">
                  {unassigned} por tomar →
                </Link>
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-muted">
            {total} actividades familiares esta semana. Las privadas no se cuentan.
          </p>
        </>
      )}
    </div>
  );
}
