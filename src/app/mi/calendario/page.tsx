import Link from "next/link";
import { Plus } from "lucide-react";
import { getMySpaces } from "@/lib/family";
import { loadMine } from "@/lib/mine";
import { parseView } from "@/lib/calendar";
import { CATEGORIES } from "@/lib/format";
import { addDays, capitalize, formatDay, isDayKey, minutesNow, startOfDay, todayKey } from "@/lib/time";
import { CalendarPage, viewRange } from "@/components/calendar/calendar-page";
import type { CalItem } from "@/components/calendar/types";
import { memberHex } from "@/components/member-avatar";
import { OccurrenceRow, occurrenceHref } from "@/components/occurrence-row";
import { Empty, Flash } from "@/components/ui";

export const metadata = { title: "Calendario" };

export default async function MiCalendario({ searchParams }: PageProps<"/mi/calendario">) {
  const sp = await searchParams;
  const { supabase, user, spaces } = await getMySpaces();
  const view = parseView(sp.vista);
  const today = todayKey();
  const anchor = isDayKey(sp.d) ? sp.d : today;
  const range = viewRange(view, anchor);
  const { items: occ, byId } = await loadMine(supabase, user.id, spaces, startOfDay(range.first), startOfDay(addDays(range.last, 1)));
  const hasFamilies = spaces.some((s) => !s.isPersonal);

  const items: CalItem[] = occ.map((o) => ({
    key: o.key,
    title: o.event.title,
    start: o.start,
    end: o.end,
    allDay: o.event.all_day,
    day: o.day,
    color: o.space.isPersonal ? "#5b3fd9" : (memberHex(o.responsibleId ? byId[o.responsibleId] : null) ?? "#f2763a"),
    href: occurrenceHref(o.space.id, o),
    done: o.done,
    emoji: CATEGORIES[o.event.category]?.emoji ?? "📌",
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
        basePath="/mi/calendario"
        listHref="/mi/semana"
        newBase="/mi/nuevo"
        selectedDay={
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold">{capitalize(formatDay(anchor))}</h2>
              <Link href={`/mi/nuevo?fecha=${anchor}`} className="btn-ghost min-h-9 py-1.5 text-accent">
                <Plus className="size-4" /> Agregar
              </Link>
            </div>
            {dayList.length ? (
              <div className="stagger card divide-y divide-line p-1">
                {dayList.map((o) => (
                  <OccurrenceRow
                    key={o.key}
                    familyId={o.space.id}
                    o={o}
                    byId={byId}
                    tag={hasFamilies ? { label: o.space.isPersonal ? "Personal" : o.space.name, personal: o.space.isPersonal } : undefined}
                  />
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
