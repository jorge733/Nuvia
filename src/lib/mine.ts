import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAgenda, type Occurrence } from "./agenda";
import type { Member, Space } from "./family";

export type MyOccurrence = Occurrence & { space: Space };

/**
 * Todo lo que involucra al usuario en todos sus espacios, entre dos instantes.
 * `needs`: lo de sus familias que espera a alguien (relevos que pidió otro y actividades sin responsable),
 * desde `now` hasta `needsUntil`.
 */
export async function loadMine(supabase: SupabaseClient, userId: string, spaces: Space[], from: Date, to: Date, opts: { now?: number; needsUntil?: Date } = {}) {
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
  const needs: MyOccurrence[] = [];
  const now = opts.now ?? Date.now();
  spaces.forEach((space, i) => {
    for (const o of lists[i]) {
      if (!space.isPersonal && opts.needsUntil && !o.event.masked && (o.end ?? o.start).getTime() >= now && o.start < opts.needsUntil) {
        const openByOther = o.relief?.status === "abierto" && o.relief.requested_by !== space.myMemberId;
        const unassigned = o.event.visibility === "familia" && !o.responsibleId && !o.relief && !o.done;
        if (openByOther || unassigned) needs.push({ ...o, space });
      }
      const mine =
        space.isPersonal ||
        o.responsibleId === space.myMemberId ||
        o.event.participant_ids.includes(space.myMemberId) ||
        (o.event.created_by === userId && o.event.visibility !== "familia") ||
        (o.relief?.status === "abierto" && o.relief.requested_by === space.myMemberId);
      if (mine && !o.event.masked) items.push({ ...o, space });
    }
  });
  const order = (a: MyOccurrence, b: MyOccurrence) => a.day.localeCompare(b.day) || Number(b.event.all_day) - Number(a.event.all_day) || a.start.getTime() - b.start.getTime();
  items.sort(order);
  needs.sort(order);
  return { items, needs, byId };
}
