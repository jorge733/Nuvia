import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, HandHeart, Heart, Scale } from "lucide-react";
import { getFamily } from "@/lib/family";
import { loadAgenda } from "@/lib/agenda";
import { CATEGORIES } from "@/lib/format";
import { addDays, formatDay, isDayKey, startOfDay, startOfWeek, todayKey } from "@/lib/time";
import { Empty, PageTitle } from "@/components/ui";
import { MemberAvatar, memberHex } from "@/components/member-avatar";

export const metadata = { title: "Balance del hogar" };

export default async function Balance({ params, searchParams }: PageProps<"/f/[id]/balance">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, members, family } = await getFamily(id);
  if (family.is_personal) redirect("/mi");

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
  const stats = members
    .filter((m) => m.kind !== "mascota")
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
        topCats: [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
      };
    })
    .sort((a, b) => b.count - a.count);
  const unassigned = shared.filter((o) => !o.responsibleId).length;
  const top = stats[0];
  const uneven = total >= 5 && top && top.share > 0.6 && stats.filter((s) => s.member.kind !== "nino").length > 1;
  const q = (d: string) => `/f/${id}/balance?d=${d}`;
  const isThisWeek = monday === startOfWeek(today);

  return (
    <div>
      <PageTitle eyebrow={`Semana del ${formatDay(monday, { day: "numeric", month: "long" })}`} sub="Lo que cada uno organiza, lleva o resuelve. Todo lo que haces por tu familia cuenta.">
        Balance del hogar
      </PageTitle>

      <div className="mb-5 flex items-center gap-1">
        <Link href={q(addDays(monday, -7))} className="btn-ghost size-11 px-0" aria-label="Semana anterior">
          <ChevronLeft className="size-5" />
        </Link>
        <Link href={q(today)} className={`min-h-10 py-1.5 ${isThisWeek ? "btn-primary" : "btn-secondary"}`}>
          Esta semana
        </Link>
        <Link href={q(addDays(monday, 7))} className="btn-ghost size-11 px-0" aria-label="Semana siguiente">
          <ChevronRight className="size-5" />
        </Link>
      </div>

      {total === 0 ? (
        <Empty icon={<Scale className="size-8" />}>No hay actividades familiares esta semana.</Empty>
      ) : (
        <div className="space-y-5">
          <section className="card">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-5xl font-semibold">{total}</p>
              <p className="text-sm text-muted">actividades compartidas</p>
            </div>
            <div className="mt-4 flex h-5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Reparto de la semana">
              {stats
                .filter((s) => s.count)
                .map((s) => (
                  <span key={s.member.id} style={{ width: `${s.share * 100}%`, background: memberHex(s.member) }} className="grow-x h-full border-r-2 border-surface last:border-0" />
                ))}
              {unassigned > 0 && <span style={{ width: `${(unassigned / total) * 100}%` }} className="h-full bg-sun/40" />}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              {stats
                .filter((s) => s.count)
                .map((s) => (
                  <span key={s.member.id} className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: memberHex(s.member) }} />
                    {s.member.name} <strong>{Math.round(s.share * 100)}%</strong>
                  </span>
                ))}
              {unassigned > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sun">
                  <span className="size-2.5 rounded-full bg-sun/50" /> Sin responsable <strong>{unassigned}</strong>
                </span>
              )}
            </div>

            {uneven ? (
              <p className="mt-5 flex items-start gap-2 rounded-2xl bg-sun-soft px-4 py-3 text-sm font-medium text-sun">
                <HandHeart className="mt-0.5 size-4 shrink-0" />
                <span>
                  {top.member.name} está organizando el {Math.round(top.share * 100)}% de la semana. ¿Alguien puede tomar algo?
                </span>
              </p>
            ) : (
              total >= 5 && (
                <p className="mt-5 flex items-center gap-2 rounded-2xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
                  <Heart className="size-4 shrink-0" /> La semana está bien repartida. ¡Buen trabajo en equipo!
                </p>
              )
            )}
          </section>

          <div className="stagger grid gap-4 sm:grid-cols-2">
            {stats.map((s) => (
              <section key={s.member.id} className="card">
                <div className="flex items-center gap-3">
                  <MemberAvatar member={s.member} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{s.member.name}</p>
                    <p className="text-sm text-muted">{s.count ? `${s.done} de ${s.count} hechas` : "Sin actividades a cargo"}</p>
                  </div>
                  <p className="font-display text-3xl font-semibold">{s.count}</p>
                </div>
                {s.count > 0 && (
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="grow-x h-full rounded-full" style={{ width: `${(s.done / s.count) * 100}%`, background: memberHex(s.member) }} />
                  </div>
                )}
                {(s.topCats.length > 0 || s.reliefsTaken > 0) && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {s.topCats.map(([c, n]) => (
                      <span key={c} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold">
                        {CATEGORIES[c]?.emoji} {CATEGORIES[c]?.label} · {n}
                      </span>
                    ))}
                    {s.reliefsTaken > 0 && (
                      <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
                        Tomó {s.reliefsTaken} {s.reliefsTaken === 1 ? "relevo" : "relevos"}
                      </span>
                    )}
                  </div>
                )}
              </section>
            ))}
          </div>
          <p className="text-center text-xs text-muted">Las actividades “Solo yo” y “Ocupado” no se cuentan.</p>
        </div>
      )}
    </div>
  );
}
