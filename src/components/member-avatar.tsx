import type { Member } from "@/lib/family";
import { MEMBER_COLORS } from "@/lib/format";

export function MemberAvatar({ member, size = 28 }: { member: Pick<Member, "name" | "color" | "kind"> | null | undefined; size?: number }) {
  if (!member) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-muted text-muted"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
        title="Sin responsable"
        aria-label="Sin responsable"
      >
        ?
      </span>
    );
  }
  const hex = MEMBER_COLORS[member.color]?.hex ?? MEMBER_COLORS.gris.hex;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: hex, fontSize: size * 0.42 }}
      title={member.name}
      aria-hidden
    >
      {member.kind === "mascota" ? "🐾" : member.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function MemberChip({ member, prefix }: { member: Pick<Member, "name" | "color" | "kind"> | null | undefined; prefix?: string }) {
  const hex = member ? (MEMBER_COLORS[member.color]?.hex ?? MEMBER_COLORS.gris.hex) : undefined;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 text-xs font-medium ${member ? "" : "bg-warn-soft pl-2.5 text-warn"}`}
      style={member ? { background: `${hex}22` } : undefined}
    >
      {member && <MemberAvatar member={member} size={20} />}
      {prefix}
      {member ? member.name : "Sin responsable"}
    </span>
  );
}
