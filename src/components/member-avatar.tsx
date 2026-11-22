import type { Member } from "@/lib/family";
import { MEMBER_COLORS } from "@/lib/format";

export function memberHex(member: Pick<Member, "color"> | null | undefined) {
  return member ? (MEMBER_COLORS[member.color]?.hex ?? MEMBER_COLORS.gris.hex) : undefined;
}

export function MemberAvatar({ member, size = 28, ring }: { member: Pick<Member, "name" | "color" | "kind"> | null | undefined; size?: number; ring?: boolean }) {
  if (!member) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-sun/60 font-semibold text-sun"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        title="Sin responsable"
        aria-label="Sin responsable"
      >
        ?
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${ring ? "ring-2 ring-surface" : ""}`}
      style={{ width: size, height: size, background: memberHex(member), fontSize: size * 0.42 }}
      title={member.name}
      aria-hidden
    >
      {member.kind === "mascota" ? "🐾" : member.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function AvatarStack({ members, size = 26, max = 5 }: { members: Pick<Member, "id" | "name" | "color" | "kind">[]; size?: number; max?: number }) {
  return (
    <span className="flex -space-x-2">
      {members.slice(0, max).map((m) => (
        <MemberAvatar key={m.id} member={m} size={size} ring />
      ))}
      {members.length > max && (
        <span className="grid place-items-center rounded-full bg-surface-2 text-[10px] font-bold text-muted ring-2 ring-surface" style={{ width: size, height: size }}>
          +{members.length - max}
        </span>
      )}
    </span>
  );
}

export function MemberChip({ member, prefix }: { member: Pick<Member, "name" | "color" | "kind"> | null | undefined; prefix?: string }) {
  const hex = memberHex(member);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 text-xs font-semibold ${member ? "text-fg" : "bg-sun-soft pl-2.5 text-sun"}`}
      style={member ? { background: `${hex}1f` } : undefined}
    >
      {member && <MemberAvatar member={member} size={20} />}
      {prefix}
      {member ? member.name : "Sin responsable"}
    </span>
  );
}
