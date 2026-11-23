import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

export type GuestEvent = {
  email: string;
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
  skipped: string[];
};

export const isGuestToken = (t: string) => /^[a-f0-9]{36}$/.test(t);

/** La actividad a la que invitaron a alguien, con su enlace personal (sin cuenta). */
export const getGuestEvent = cache(async (token: string) => {
  if (!isGuestToken(token)) return null;
  const supabase = createClient(supabaseUrl(), supabaseKey(), { auth: { persistSession: false } });
  const { data } = await supabase.rpc("guest_event", { p_token: token });
  return ((data as GuestEvent[] | null) ?? [])[0] ?? null;
});
