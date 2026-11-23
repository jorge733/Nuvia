import type { SupabaseClient } from "@supabase/supabase-js";
import { dayKey, expand } from "./time";

export type AgendaEvent = {
  id: string;
  family_id: string;
  created_by: string | null;
  title: string;
  notes: string | null;
  location: string | null;
  category: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  visibility: "familia" | "privado" | "ocupado";
  recurrence: string;
  recur_interval: number;
  recur_until: string | null;
  recur_days?: number[] | null;
  responsible_id: string | null;
  participant_ids: string[];
  masked: boolean;
};

export type Relief = {
  id: string;
  event_id: string;
  occurrence_start: string;
  requested_by: string | null;
  reason: string | null;
  status: "abierto" | "tomado" | "cancelado";
  taken_by: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type Occurrence = {
  key: string;
  event: AgendaEvent;
  start: Date;
  end: Date | null;
  day: string;
  /** Responsable efectivo de esta repetición (considera relevos tomados). */
  responsibleId: string | null;
  relief: Relief | null;
  doneBy: string | null;
  done: boolean;
};

export const occKey = (eventId: string, start: string | Date) => `${eventId}|${new Date(start).getTime()}`;

/** Carga los eventos de una familia entre dos instantes y los expande en repeticiones. */
export async function loadAgenda(supabase: SupabaseClient, familyId: string, from: Date, to: Date): Promise<Occurrence[]> {
  const { data } = await supabase.rpc("agenda_events", { fid: familyId, p_from: from.toISOString(), p_to: to.toISOString() });
  const events = (data as AgendaEvent[] | null) ?? [];
  if (!events.length) return [];

  const ids = events.map((e) => e.id);
  const lo = new Date(from.getTime() - 2 * 86400000).toISOString();
  const hi = to.toISOString();
  const [reliefs, completions, skips] = await Promise.all([
    supabase.from("relief_requests").select("*").in("event_id", ids).neq("status", "cancelado").gte("occurrence_start", lo).lte("occurrence_start", hi),
    supabase.from("event_completions").select("event_id, occurrence_start, completed_by").in("event_id", ids).gte("occurrence_start", lo).lte("occurrence_start", hi),
    supabase.from("event_skips").select("event_id, occurrence_start").in("event_id", ids).gte("occurrence_start", lo).lte("occurrence_start", hi),
  ]);

  const reliefMap = new Map(((reliefs.data as Relief[]) ?? []).map((r) => [occKey(r.event_id, r.occurrence_start), r]));
  const doneMap = new Map((completions.data ?? []).map((c) => [occKey(c.event_id, c.occurrence_start), c.completed_by as string | null]));
  const skipSet = new Set((skips.data ?? []).map((s) => occKey(s.event_id, s.occurrence_start)));

  const out: Occurrence[] = [];
  for (const event of events) {
    for (const { start, end } of expand(event, from, to)) {
      const key = occKey(event.id, start);
      if (skipSet.has(key)) continue;
      const relief = reliefMap.get(key) ?? null;
      out.push({
        key,
        event,
        start,
        end,
        day: dayKey(start),
        responsibleId: relief?.status === "tomado" ? relief.taken_by : event.responsible_id,
        relief,
        doneBy: doneMap.get(key) ?? null,
        done: doneMap.has(key),
      });
    }
  }
  return out.sort((a, b) => a.day.localeCompare(b.day) || Number(b.event.all_day) - Number(a.event.all_day) || a.start.getTime() - b.start.getTime());
}

export function groupByDay(list: Occurrence[]) {
  const map = new Map<string, Occurrence[]>();
  for (const o of list) map.set(o.day, [...(map.get(o.day) ?? []), o]);
  return map;
}

/** Busca una repetición concreta de un evento (para la página de detalle). */
export async function loadOccurrence(supabase: SupabaseClient, familyId: string, eventId: string, startIso: string | null) {
  const at = startIso ? new Date(startIso) : null;
  if (at && Number.isNaN(at.getTime())) return null;
  if (at) {
    const list = await loadAgenda(supabase, familyId, new Date(at.getTime() - 60000), new Date(at.getTime() + 60000));
    return list.find((o) => o.event.id === eventId && o.start.getTime() === at.getTime()) ?? null;
  }
  // Sin repetición indicada: la próxima (o la última, si ya pasó).
  const now = Date.now();
  const list = await loadAgenda(supabase, familyId, new Date(now - 400 * 86400000), new Date(now + 400 * 86400000));
  const mine = list.filter((o) => o.event.id === eventId);
  return mine.find((o) => o.start.getTime() >= now - 3600000) ?? mine.at(-1) ?? null;
}
