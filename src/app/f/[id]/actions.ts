"use server";

import { revalidatePath } from "next/cache";
import { back, getFamily, safePath, text } from "@/lib/family";
import { CATEGORIES } from "@/lib/format";
import { dayKey, fromLocal, isDayKey, keyParts, RECURRENCE_LABEL } from "@/lib/time";

const VISIBILITIES = ["familia", "privado", "ocupado"];

function parseEvent(formData: FormData, memberIds: Set<string>) {
  const title = text(formData, "title").slice(0, 120);
  const date = text(formData, "date");
  const allDay = formData.get("all_day") === "on";
  const start = text(formData, "start");
  const end = text(formData, "end");
  const category = text(formData, "category");
  const recurrence = text(formData, "recurrence");
  const until = text(formData, "recur_until");
  const visibility = text(formData, "visibility");
  const responsible = text(formData, "responsible");

  if (!title) return { error: "Escribe qué hay que hacer" } as const;
  if (!isDayKey(date)) return { error: "Elige una fecha" } as const;
  if (!allDay && !/^\d{2}:\d{2}$/.test(start)) return { error: "Indica la hora o marca “Todo el día”" } as const;
  if (end && !/^\d{2}:\d{2}$/.test(end)) return { error: "Hora de término no válida" } as const;
  if (!allDay && end && end <= start) return { error: "La hora de término debe ser después del inicio" } as const;
  if (until && (!isDayKey(until) || until < date)) return { error: "La fecha de término de la repetición no es válida" } as const;

  const { y, m, d } = keyParts(date);
  const [sh, sm] = allDay ? [0, 0] : start.split(":").map(Number);
  const startsAt = fromLocal(y, m, d, sh, sm);
  let endsAt: Date | null = null;
  if (!allDay && end) {
    const [eh, em] = end.split(":").map(Number);
    endsAt = fromLocal(y, m, d, eh, em);
  }

  const vis = VISIBILITIES.includes(visibility) ? visibility : "familia";
  return {
    row: {
      title,
      notes: text(formData, "notes").slice(0, 2000) || null,
      location: text(formData, "location").slice(0, 160) || null,
      category: category in CATEGORIES ? category : "otro",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt?.toISOString() ?? null,
      all_day: allDay,
      visibility: vis,
      recurrence: recurrence in RECURRENCE_LABEL ? recurrence : "none",
      recur_until: recurrence !== "none" && until ? until : null,
      // Los eventos privados no tienen responsable familiar.
      responsible_id: vis === "familia" && memberIds.has(responsible) ? responsible : null,
    },
    participants: formData.getAll("participants").map(String).filter((p) => memberIds.has(p)),
    day: date,
  } as const;
}

export async function createEvent(familyId: string, formData: FormData) {
  const { supabase, user, members } = await getFamily(familyId);
  const parsed = parseEvent(formData, new Set(members.map((m) => m.id)));
  if ("error" in parsed) back(`/f/${familyId}/nuevo?fecha=${text(formData, "date")}`, { error: parsed.error! });

  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed.row, family_id: familyId, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) back(`/f/${familyId}/nuevo`, { error: "No se pudo guardar. Inténtalo de nuevo." });
  if (parsed.participants.length) {
    await supabase.from("event_participants").insert(parsed.participants.map((member_id) => ({ event_id: data.id, member_id })));
  }
  revalidatePath(`/f/${familyId}`, "layout");
  const today = dayKey(new Date());
  const dest = parsed.day === today ? `/f/${familyId}` : `/f/${familyId}/semana?d=${parsed.day}`;
  back(dest, { ok: `“${parsed.row.title}” quedó agendado` });
}

export async function updateEvent(familyId: string, eventId: string, formData: FormData) {
  const { supabase, members } = await getFamily(familyId);
  const parsed = parseEvent(formData, new Set(members.map((m) => m.id)));
  const editPath = `/f/${familyId}/e/${eventId}/editar`;
  if ("error" in parsed) back(editPath, { error: parsed.error! });

  const { error } = await supabase.from("events").update(parsed.row).eq("id", eventId).eq("family_id", familyId);
  if (error) back(editPath, { error: "No se pudo guardar" });
  await supabase.from("event_participants").delete().eq("event_id", eventId);
  if (parsed.participants.length) {
    await supabase.from("event_participants").insert(parsed.participants.map((member_id) => ({ event_id: eventId, member_id })));
  }
  revalidatePath(`/f/${familyId}`, "layout");
  back(`/f/${familyId}/e/${eventId}`, { ok: "Cambios guardados" });
}

export async function deleteEvent(familyId: string, eventId: string) {
  const { supabase } = await getFamily(familyId);
  const { error, count } = await supabase.from("events").delete({ count: "exact" }).eq("id", eventId).eq("family_id", familyId);
  revalidatePath(`/f/${familyId}`, "layout");
  back(`/f/${familyId}/semana`, error || !count ? { error: "No se pudo eliminar" } : { ok: "Eliminado" });
}

export async function skipOccurrence(familyId: string, eventId: string, startIso: string) {
  const { supabase } = await getFamily(familyId);
  const { error } = await supabase.from("event_skips").insert({ event_id: eventId, occurrence_start: startIso });
  revalidatePath(`/f/${familyId}`, "layout");
  const day = dayKey(new Date(startIso));
  back(`/f/${familyId}/semana?d=${day}`, error ? { error: "No se pudo eliminar ese día" } : { ok: "Se quitó solo ese día" });
}

export async function toggleDone(familyId: string, eventId: string, startIso: string, done: boolean, from: string) {
  const { supabase, me } = await getFamily(familyId);
  const { error } = done
    ? await supabase.from("event_completions").delete().eq("event_id", eventId).eq("occurrence_start", startIso)
    : await supabase.from("event_completions").insert({ event_id: eventId, occurrence_start: startIso, family_id: familyId, completed_by: me.id });
  revalidatePath(`/f/${familyId}`, "layout");
  back(safePath(from, `/f/${familyId}`), error ? { error: "No se pudo actualizar" } : { ok: done ? "Marcado como pendiente" : "¡Hecho! ✓" });
}

export async function requestRelief(familyId: string, eventId: string, startIso: string, formData: FormData) {
  const { supabase, me } = await getFamily(familyId);
  const path = `/f/${familyId}/e/${eventId}?o=${encodeURIComponent(startIso)}`;
  const { error } = await supabase.from("relief_requests").insert({
    event_id: eventId,
    family_id: familyId,
    occurrence_start: startIso,
    requested_by: me.id,
    reason: text(formData, "reason").slice(0, 300) || null,
  });
  revalidatePath(`/f/${familyId}`, "layout");
  back(path, error ? { error: error.code === "23505" ? "Ya hay un relevo pedido para este día" : "No se pudo pedir el relevo" } : { ok: "Relevo pedido. Avísale a tu familia 👇" });
}

export async function takeRelief(familyId: string, reliefId: string, from: string) {
  const { supabase } = await getFamily(familyId);
  const { error } = await supabase.rpc("take_relief", { p_relief_id: reliefId });
  revalidatePath(`/f/${familyId}`, "layout");
  back(safePath(from, `/f/${familyId}`), error ? { error: error.message.includes("ya fue") ? "Alguien ya tomó este relevo" : "No se pudo tomar el relevo" } : { ok: "¡Gracias! Ahora te encargas tú 💜" });
}

export async function cancelRelief(familyId: string, reliefId: string, from: string) {
  const { supabase } = await getFamily(familyId);
  const { error } = await supabase.from("relief_requests").update({ status: "cancelado", resolved_at: new Date().toISOString() }).eq("id", reliefId).eq("family_id", familyId);
  revalidatePath(`/f/${familyId}`, "layout");
  back(safePath(from, `/f/${familyId}`), error ? { error: "No se pudo cancelar" } : { ok: "Relevo cancelado" });
}

// "Me encargo yo": para una actividad sin responsable (o para quedarse con esta repetición).
export async function takeOccurrence(familyId: string, eventId: string, startIso: string, recurring: boolean, from: string) {
  const { supabase, me } = await getFamily(familyId);
  const { error } = recurring
    ? await supabase.from("relief_requests").insert({ event_id: eventId, family_id: familyId, occurrence_start: startIso, status: "tomado", taken_by: me.id, resolved_at: new Date().toISOString() })
    : await supabase.from("events").update({ responsible_id: me.id }).eq("id", eventId).eq("family_id", familyId);
  revalidatePath(`/f/${familyId}`, "layout");
  back(safePath(from, `/f/${familyId}`), error ? { error: "No se pudo asignar" } : { ok: "¡Gracias! Ahora te encargas tú 💜" });
}
