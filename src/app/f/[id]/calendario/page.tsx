import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getFamily } from "@/lib/family";
import { loadAgenda } from "@/lib/agenda";
import { parseView } from "@/lib/calendar";
import { CATEGORIES } from "@/lib/format";
import { addDays, capitalize, formatDay, isDayKey, minutesNow, startOfDay, todayKey } from "@/lib/time";
import { CalendarPage, viewRange } from "@/components/calendar/calendar-page";
import type { CalItem } from "@/components/calendar/types";
import { memberHex } from "@/components/member-avatar";
import { OccurrenceRow, occurrenceHref } from "@/components/occurrence-row";
import { Empty, Flash } from "@/components/ui";

export const metadata = { title: "Calendario" };

export default async function Calendario({ params, searchParams }: PageProps<"/f/[id]/calendario">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, byId, family } = await getFamily(id);
  if (family.is_personal) redirect(`/mi/calendario${sp.vista ? `?vista=${sp.vista}` : ""}`);

  const view = parseView(sp.vista);
  const today = todayKey();
  const anchor = isDayKey(sp.d) ? sp.d : today;
  const range = viewRange(view, anchor);
  const occ = await loadAgenda(supabase, id, startOfDay(range.first), startOfDay(addDays(range.last, 1)));

  const items: CalItem[] = occ.map((o) => ({
    key: o.key,
    title: o.event.title,
    start: o.start,
    end: o.end,
    allDay: o.event.all_day,
    day: o.day,
    color: o.event.masked
      ? "var(--muted)"
      : o.relief?.status === "abierto" || !o.responsibleId
        ? o.event.visibility === "familia"
          ? "#f2763a"
          : "#5b3fd9"
        : (memberHex(byId[o.responsibleId]) ?? "#8a8780"),
    href: o.event.masked ? null : occurrenceHref(id, o),
    done: o.done,
    emoji: o.event.masked ? "·" : (CATEGORIES[o.event.category]?.emoji ?? "📌"),
  }));
  const dayList = occ.filter((o) => o.day === anchor);

  return (
    <>
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} link={sp.abrir} />
      <CalendarPage
        view={view}
        anchor={anchor}
        today={today}
        nowMinutes={minutesNow()}
        items={items}
        basePath={`/f/${id}/calendario`}
        listHref={`/f/${id}/semana`}
        newBase={`/f/${id}/nuevo`}
        selectedDay={
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold">{capitalize(formatDay(anchor))}</h2>
              <Link href={`/f/${id}/nuevo?fecha=${anchor}`} className="btn-ghost min-h-9 py-1.5 text-accent">
                <Plus className="size-4" /> Agregar
              </Link>
            </div>
            {dayList.length ? (
              <div className="stagger card divide-y divide-line p-1">
                {dayList.map((o) => (
                  <OccurrenceRow key={o.key} familyId={id} o={o} byId={byId} />
                ))}
              </div>
            ) : (
              <Empty>Día libre.</Empty>
            )}
          </section>
        }
      />
    </>
  );
}
