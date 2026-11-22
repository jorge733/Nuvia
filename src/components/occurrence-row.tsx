import Link from "next/link";
import type { Occurrence } from "@/lib/agenda";
import type { Member } from "@/lib/family";
import { CATEGORIES } from "@/lib/format";
import { timeOf } from "@/lib/time";
import { MemberAvatar, MemberChip } from "./member-avatar";

export function occurrenceHref(familyId: string, o: Occurrence) {
  return `/f/${familyId}/e/${o.event.id}?o=${encodeURIComponent(o.start.toISOString())}`;
}

export function OccurrenceRow({
  familyId,
  o,
  byId,
  showDay,
  action,
}: {
  familyId: string;
  o: Occurrence;
  byId: Record<string, Member>;
  showDay?: string;
  action?: React.ReactNode;
}) {
  const cat = CATEGORIES[o.event.category] ?? CATEGORIES.otro;
  const responsible = o.responsibleId ? byId[o.responsibleId] : null;
  const participants = o.event.participant_ids.map((id) => byId[id]).filter(Boolean);
  const masked = o.event.masked;

  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${o.done ? "opacity-60" : ""}`}>
      <div className="w-14 shrink-0 pt-0.5 text-sm tabular-nums text-muted">
        {showDay && <div className="text-xs">{showDay}</div>}
        {o.event.all_day ? "Todo el día" : timeOf(o.start)}
      </div>
      <Link href={masked ? "#" : occurrenceHref(familyId, o)} className={`min-w-0 flex-1 ${masked ? "pointer-events-none" : "group"}`}>
        <div className="flex items-center gap-2">
          <span aria-hidden>{masked ? "⛔" : cat.emoji}</span>
          <span className={`truncate font-medium group-hover:text-accent ${o.done ? "line-through" : ""}`}>{o.event.title}</span>
          {o.event.visibility === "privado" && <span className="text-xs text-muted">🔒</span>}
        </div>
        {!masked && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {o.relief?.status === "abierto" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn">🙋 Necesita relevo</span>
            ) : (
              o.event.visibility === "familia" && <MemberChip member={responsible} />
            )}
            {o.relief?.status === "tomado" && o.relief.requested_by && <span className="text-xs text-muted">relevo tomado</span>}
            {participants.length > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-muted">
                para
                <span className="ml-1 flex -space-x-1.5">
                  {participants.slice(0, 4).map((p) => (
                    <MemberAvatar key={p.id} member={p} size={20} />
                  ))}
                </span>
              </span>
            )}
            {o.done && <span className="text-xs font-semibold text-ok">✓ Hecho</span>}
          </div>
        )}
        {masked && <div className="mt-1 text-xs text-muted">Ocupado · sin detalles</div>}
      </Link>
      {action}
    </div>
  );
}
