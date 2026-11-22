import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, House, Plus } from "lucide-react";
import { getMySpaces } from "@/lib/family";
import { groupByDay } from "@/lib/agenda";
import { loadMine, type MyOccurrence } from "@/lib/mine";
import { addDays, capitalize, formatDay, nowMs, relativeDay, shortDay, startOfDay, todayKey } from "@/lib/time";
import { Empty, Flash, SectionHeader } from "@/components/ui";
import { DoneButton } from "@/components/done-button";
import { OccurrenceRow } from "@/components/occurrence-row";
import { toggleDone } from "@/app/f/[id]/actions";

function greeting(hour: number) {
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default async function MiAgenda({ searchParams }: PageProps<"/mi">) {
  const sp = await searchParams;
  const { supabase, user, spaces } = await getMySpaces();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  if (!profile?.full_name) redirect("/perfil?bienvenida=1");

  const today = todayKey();
  const { items, byId } = await loadMine(supabase, user.id, spaces, startOfDay(today), startOfDay(addDays(today, 14)));
  const days = groupByDay(items) as Map<string, MyOccurrence[]>;
  const now = nowMs();
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", hour: "numeric", hourCycle: "h23" }).format(now));
  const families = spaces.filter((s) => !s.isPersonal);

  const todayList = days.get(today) ?? [];
  const tomorrow = addDays(today, 1);
  const tomorrowList = days.get(tomorrow) ?? [];
  const nextDays = Array.from({ length: 12 }, (_, i) => addDays(today, i + 2)).filter((d) => days.get(d)?.length);
  const pendingToday = todayList.filter((o) => !o.done).length;
  const tag = (o: MyOccurrence) => ({ label: o.space.isPersonal ? "Personal" : o.space.name, personal: o.space.isPersonal });

  const row = (o: MyOccurrence, opts: { showDay?: boolean; done?: boolean } = {}) => (
    <OccurrenceRow
      key={o.key}
      familyId={o.space.id}
      o={o}
      byId={byId}
      tag={families.length ? tag(o) : undefined}
      showDay={opts.showDay ? shortDay(o.day, today) : undefined}
      action={
        opts.done ? (
          <form action={toggleDone.bind(null, o.space.id, o.event.id, o.start.toISOString(), o.done, "/mi")}>
            <DoneButton done={o.done} />
          </form>
        ) : undefined
      }
    />
  );

  return (
    <div className="space-y-8">
      <div>
        <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
        <header className="rise hero-glow relative overflow-hidden rounded-[2rem] p-6 text-white shadow-soft sm:p-8" style={{ background: "var(--hero)" }}>
          <div className="float-slow pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/10" aria-hidden />
          <p className="text-sm font-semibold text-white/80">{capitalize(formatDay(today))}</p>
          <h1 className="mt-1 text-4xl font-semibold sm:text-5xl">
            {greeting(hour)}, {profile.full_name.split(" ")[0]}
          </h1>
          <p className="mt-3 max-w-md text-white/85">
            {todayList.length === 0
              ? "Hoy tienes el día libre. Disfrútalo."
              : pendingToday === 0
                ? "Ya hiciste todo lo de hoy. ¡Bien!"
                : `Hoy tienes ${pendingToday} ${pendingToday === 1 ? "cosa pendiente" : "cosas pendientes"}${families.length ? ", entre lo tuyo y lo de tu familia" : ""}.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
            <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">{todayList.length} hoy</span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">{tomorrowList.length} mañana</span>
          </div>
        </header>
      </div>

      <section>
        <SectionHeader title="Hoy" href="/mi/nuevo" linkText="＋ Agregar" />
        {todayList.length ? <div className="stagger card divide-y divide-line p-1">{todayList.map((o) => row(o, { done: true }))}</div> : <Empty>Nada para hoy.</Empty>}
      </section>

      <section>
        <SectionHeader title="Mañana" />
        {tomorrowList.length ? <div className="stagger card divide-y divide-line p-1">{tomorrowList.map((o) => row(o))}</div> : <Empty>Nada para mañana.</Empty>}
      </section>

      {nextDays.length > 0 && (
        <section>
          <SectionHeader title="Próximos días" href="/mi/semana" linkText="Ver semana" />
          <div className="stagger space-y-4">
            {nextDays.map((d) => (
              <div key={d} className="card p-1">
                <p className="px-4 pt-3 pb-1 text-sm font-bold text-muted">{relativeDay(d, today)}</p>
                <div className="divide-y divide-line">{days.get(d)!.map((o) => row(o))}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="Mis familias" />
        <div className="grid gap-3 sm:grid-cols-2">
          {families.map((f) => (
            <Link key={f.id} href={`/f/${f.id}`} className="card flex items-center gap-4 transition hover:ring-2 hover:ring-accent/30">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
                <House className="size-5" />
              </span>
              <span className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{f.name}</span>
              <ChevronRight className="size-5 text-muted" />
            </Link>
          ))}
          <Link href="/crear" className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-line p-5 text-muted transition hover:border-accent hover:text-accent">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2">
              <Plus className="size-5" />
            </span>
            <span className="font-semibold">{families.length ? "Crear otra familia" : "Crear la agenda de mi familia"}</span>
          </Link>
          {!families.length && (
            <Link href="/unirse" className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-line p-5 text-muted transition hover:border-accent hover:text-accent sm:col-span-2">
              <span className="font-semibold">¿Te invitaron? Únete con un código</span>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
