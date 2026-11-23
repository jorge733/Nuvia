import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

export type GuestEvent = {
  /** null si se abrió con el enlace compartido (no es un invitado en particular). */
  email: string | null;
  muted: boolean;
  inviter: string | null;
  family_name: string | null;
  event_id: string;
  title: string;
  notes: string | null;
  location: string | null;
  category: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  recurrence: string;
  recur_interval: number;
  recur_until: string | null;
  recur_days?: number[] | null;
  skipped: string[];
};

/** Enlace personal de un invitado (36) o enlace compartido de la actividad (40). */
export const isGuestToken = (t: string) => /^[a-f0-9]{36}$/.test(t);
export const isShareToken = (t: string) => /^[a-f0-9]{40}$/.test(t);

export const anonClient = () => createClient(supabaseUrl(), supabaseKey(), { auth: { persistSession: false } });

/** La actividad de una invitación (sin cuenta): con el enlace personal o con el enlace compartido. */
export const getGuestEvent = cache(async (token: string) => {
  const rpc = isGuestToken(token) ? "guest_event" : isShareToken(token) ? "shared_event" : null;
  if (!rpc) return null;
  const { data } = await anonClient().rpc(rpc, { p_token: token });
  return ((data as GuestEvent[] | null) ?? [])[0] ?? null;
});
