import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAgenda, type Occurrence } from "./agenda";
import type { Member, Space } from "./family";

export type MyOccurrence = Occurrence & { space: Space };

/** Todo lo que involucra al usuario en todos sus espacios, entre dos instantes. */
export async function loadMine(supabase: SupabaseClient, userId: string, spaces: Space[], from: Date, to: Date) {
  const [lists, { data: memberRows }] = await Promise.all([
    Promise.all(spaces.map((s) => loadAgenda(supabase, s.id, from, to))),
    supabase
      .from("family_members")
      .select("id, family_id, user_id, name, kind, color, role, phone")
      .in("family_id", spaces.map((s) => s.id))
      .returns<Member[]>(),
  ]);
  const byId = Object.fromEntries((memberRows ?? []).map((m) => [m.id, m])) as Record<string, Member>;

  const items: MyOccurrence[] = [];
  spaces.forEach((space, i) => {
    for (const o of lists[i]) {
      const mine =
        space.isPersonal ||
        o.responsibleId === space.myMemberId ||
        o.event.participant_ids.includes(space.myMemberId) ||
        (o.event.created_by === userId && o.event.visibility !== "familia") ||
        (o.relief?.status === "abierto" && o.relief.requested_by === space.myMemberId);
      if (mine && !o.event.masked) items.push({ ...o, space });
    }
  });
  items.sort((a, b) => a.day.localeCompare(b.day) || Number(b.event.all_day) - Number(a.event.all_day) || a.start.getTime() - b.start.getTime());
  return { items, byId };
}
