import Link from "next/link";
import { Lock, MapPin, Repeat } from "lucide-react";
import type { Occurrence } from "@/lib/agenda";
import type { Member } from "@/lib/family";
import { CATEGORIES } from "@/lib/format";
import { timeOf } from "@/lib/time";
import { AvatarStack, MemberChip, memberHex } from "./member-avatar";

export function occurrenceHref(familyId: string, o: Occurrence) {
  return `/f/${familyId}/e/${o.event.id}?o=${encodeURIComponent(o.start.toISOString())}`;
}

/** Una actividad: franja del color de quien se encarga, hora, título y personas. */
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
  const needsRelief = o.relief?.status === "abierto";
  const unassigned = !responsible && !needsRelief && !masked && o.event.visibility === "familia";
  const stripe = needsRelief || unassigned ? "var(--sun)" : masked || o.event.visibility !== "familia" ? "var(--line)" : memberHex(responsible);

  const body = (
    <>
      <span className="absolute inset-y-3 left-0 w-1 rounded-r-full" style={{ background: stripe, opacity: unassigned ? 0.45 : 1 }} aria-hidden />
      <div className="w-[3.25rem] shrink-0 pt-0.5 text-right tabular-nums">
        {showDay && <div className="text-[11px] font-semibold text-muted">{showDay}</div>}
        <div className={`text-sm font-semibold ${o.done ? "text-muted" : ""}`}>{o.event.all_day ? "Día" : timeOf(o.start)}</div>
        {o.end && !o.event.all_day && <div className="text-[11px] text-muted">{timeOf(o.end)}</div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-sm" aria-hidden>
            {masked ? "·" : cat.emoji}
          </span>
          <span className={`mt-0.5 line-clamp-2 font-semibold break-words ${o.done ? "text-muted line-through decoration-2" : ""}`}>{o.event.title}</span>
          {o.event.visibility === "privado" && <Lock className="mt-1 size-3.5 shrink-0 text-muted" aria-label="Solo yo" />}
          {o.event.recurrence !== "none" && !masked && <Repeat className="mt-1 size-3.5 shrink-0 text-muted" aria-label="Se repite" />}
        </div>
        {masked ? (
          <p className="mt-1 pl-9 text-xs text-muted">Ocupado · sin detalles</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-9">
            {needsRelief ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sun-soft px-2.5 py-1 text-xs font-bold text-sun">Necesita relevo</span>
            ) : (
              o.event.visibility === "familia" && <MemberChip member={responsible} />
            )}
            {participants.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                para <AvatarStack members={participants} size={20} max={4} />
              </span>
            )}
            {o.event.location && (
              <span className="inline-flex max-w-40 items-center gap-1 truncate text-xs text-muted">
                <MapPin className="size-3 shrink-0" />
                {o.event.location}
              </span>
            )}
            {o.done && <span className="text-xs font-bold text-ok">Hecho</span>}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className={`relative flex items-start gap-3 py-3.5 pr-3 pl-3 ${o.done ? "opacity-70" : ""}`}>
      {masked ? (
        <div className="flex min-w-0 flex-1 items-start gap-3">{body}</div>
      ) : (
        <Link href={occurrenceHref(familyId, o)} className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl transition hover:opacity-80">
          {body}
        </Link>
      )}
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
