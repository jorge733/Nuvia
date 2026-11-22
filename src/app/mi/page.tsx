import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, House, Plus } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { getMySpaces } from "@/lib/family";
import { groupByDay } from "@/lib/agenda";
import { loadMine, type MyOccurrence } from "@/lib/mine";
import { addDays, capitalize, formatDay, nowMs, relativeDay, shortDay, startOfDay, todayKey } from "@/lib/time";
import { Empty, Flash, SectionHeader } from "@/components/ui";
import { DoneButton } from "@/components/done-button";
import { OccurrenceRow } from "@/components/occurrence-row";
import { QuickAdd } from "@/components/quick-add";
import { takeOccurrence, takeRelief, toggleDone } from "@/app/f/[id]/actions";

function greeting(hour: number) {
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default async function MiAgenda({ searchParams }: PageProps<"/mi">) {
  const sp = await searchParams;
  const { supabase, user, spaces, personalId } = await getMySpaces();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  if (!profile?.full_name) redirect("/perfil?bienvenida=1");

  const today = todayKey();
  const now = nowMs();
  const loaded = await loadMine(supabase, user.id, spaces, startOfDay(today), startOfDay(addDays(today, 14)), { now, needsUntil: startOfDay(addDays(today, 7)) });
  const { byId } = loaded;
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", hour: "numeric", hourCycle: "h23" }).format(now));
  const families = spaces.filter((s) => !s.isPersonal);

  // Filtro: todo, solo lo personal o una familia.
  const ver = typeof sp.ver === "string" ? sp.ver : "";
  const filter = ver === "yo" ? spaces.find((s) => s.isPersonal) : families.find((f) => f.id === ver);
  const keep = (o: MyOccurrence) => !filter || o.space.id === filter.id;
  const items = loaded.items.filter(keep);
  const needs = loaded.needs.filter(keep);
  const days = groupByDay(items) as Map<string, MyOccurrence[]>;
  const self = filter ? `/mi?ver=${ver}` : "/mi";

  const todayList = days.get(today) ?? [];
  const tomorrow = addDays(today, 1);
  const tomorrowList = days.get(tomorrow) ?? [];
  const nextDays = Array.from({ length: 12 }, (_, i) => addDays(today, i + 2)).filter((d) => days.get(d)?.length);
  const pendingToday = todayList.filter((o) => !o.done).length;
  const tag = (o: MyOccurrence) => ({ label: o.space.isPersonal ? "Solo yo" : o.space.name, personal: o.space.isPersonal });

  const row = (o: MyOccurrence, opts: { showDay?: boolean; done?: boolean; action?: ReactNode } = {}) => (
    <OccurrenceRow
      key={o.key}
      familyId={o.space.id}
      o={o}
      byId={byId}
      tag={families.length ? tag(o) : undefined}
      showDay={opts.showDay ? shortDay(o.day, today) : undefined}
      action={
        opts.action ??
        (opts.done ? (
          <form action={toggleDone.bind(null, o.space.id, o.event.id, o.start.toISOString(), o.done, self)}>
            <DoneButton done={o.done} />
          </form>
        ) : undefined)
      }
    />
  );

  return (
    <div className="space-y-8">
      <div>
        <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} link={sp.abrir} />
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
                : `Hoy tienes ${pendingToday} ${pendingToday === 1 ? "cosa pendiente" : "cosas pendientes"}${families.length && !filter ? ", entre lo tuyo y lo de tu familia" : ""}.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
            <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">{todayList.length} hoy</span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">{tomorrowList.length} mañana</span>
            {needs.length > 0 && (
              <a href="#te-necesitan" className="rounded-full bg-white px-3 py-1.5 text-sun">
                {needs.length} {needs.length === 1 ? "espera" : "esperan"} a alguien
              </a>
            )}
          </div>
        </header>
      </div>

      {personalId && (
        <QuickAdd from="/mi" defaultSpace={personalId} spaces={spaces.map((s) => ({ id: s.id, name: s.isPersonal ? "Solo yo" : s.name }))} />
      )}

      {families.length > 0 && (
        <nav className="-mx-4 -mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" aria-label="Mostrar">
          {[{ key: "", label: "Todo" }, { key: "yo", label: "Solo yo" }, ...families.map((f) => ({ key: f.id, label: f.name }))].map((c) => {
            const active = c.key === (filter ? ver : "");
            return (
              <Link
                key={c.key || "todo"}
                href={c.key ? `/mi?ver=${c.key}` : "/mi"}
                aria-current={active ? "true" : undefined}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg"}`}
              >
                {c.label}
              </Link>
            );
          })}
        </nav>
      )}

      {needs.length > 0 && (
        <section id="te-necesitan" className="scroll-mt-32">
          <SectionHeader title="Tu familia te necesita" count={needs.length} />
          <div className="stagger card divide-y divide-line p-1 ring-2 ring-sun/40">
            {needs.map((o) =>
              row(o, {
                showDay: true,
                action:
                  o.relief?.status === "abierto" ? (
                    <form action={takeRelief.bind(null, o.space.id, o.relief.id, self)}>
                      <SubmitButton className="btn-sun min-h-9 px-4 py-1.5 text-xs" pendingText="…">
                        Yo voy
                      </SubmitButton>
                    </form>
                  ) : (
                    <form action={takeOccurrence.bind(null, o.space.id, o.event.id, o.start.toISOString(), o.event.recurrence !== "none", self)}>
                      <SubmitButton className="btn-secondary min-h-9 px-4 py-1.5 text-xs" pendingText="…">
                        Me encargo
                      </SubmitButton>
                    </form>
                  ),
              }),
            )}
          </div>
        </section>
      )}

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
