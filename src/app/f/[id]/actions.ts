"use server";

import { revalidatePath } from "next/cache";
import { back, getFamily, safePath, text } from "@/lib/family";
import { guessCategory, parseQuick } from "@/lib/quick";
import { CATEGORIES } from "@/lib/format";
import { dayKey, formatWhen, fromLocal, isDayKey, keyParts, RECURRENCE_LABEL } from "@/lib/time";

const VISIBILITIES = ["familia", "privado", "ocupado"];

type ParseOpts = { visibility?: string; responsibleKey?: string; participantsKey?: string };

function parseEvent(formData: FormData, memberIds: Set<string>, opts: ParseOpts = {}) {
  const title = text(formData, "title").slice(0, 120);
  const date = text(formData, "date");
  const start = text(formData, "start");
  const allDay = formData.get("all_day") === "on" || !start;
  const end = text(formData, "end");
  const category = text(formData, "category");
  const recurrence = text(formData, "recurrence");
  const until = text(formData, "recur_until");
  const visibility = opts.visibility ?? text(formData, "visibility");
  const responsible = text(formData, opts.responsibleKey ?? "responsible");

  if (!title) return { error: "Escribe qué hay que hacer" } as const;
  if (!isDayKey(date)) return { error: "Elige una fecha" } as const;
  if (!allDay && !/^\d{2}:\d{2}$/.test(start)) return { error: "La hora no es válida" } as const;
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
      category: category in CATEGORIES ? category : guessCategory(title),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt?.toISOString() ?? null,
      all_day: allDay,
      visibility: vis,
      recurrence: recurrence in RECURRENCE_LABEL ? recurrence : "none",
      recur_until: recurrence !== "none" && until ? until : null,
      // Los eventos privados no tienen responsable familiar.
      responsible_id: vis === "familia" && memberIds.has(responsible) ? responsible : null,
    },
    participants: formData.getAll(opts.participantsKey ?? "participants").map(String).filter((p) => memberIds.has(p)),
    day: date,
  } as const;
}

/**
 * Crear desde el formulario único. "¿Quién lo ve?" decide dónde se guarda:
 * `dest` = "<espacio>:<visibilidad>" (Solo yo → agenda personal; Familia / Ocupado → esa familia).
 */
export async function createEvent(formData: FormData) {
  const [familyId, chosen] = text(formData, "dest").split(":");
  const date = text(formData, "date");
  if (!/^[0-9a-f-]{36}$/.test(familyId ?? "")) back(`/mi/nuevo${isDayKey(date) ? `?fecha=${date}` : ""}`, { error: "Elige quién lo ve" });
  const retry = `/mi/nuevo?para=${familyId}${isDayKey(date) ? `&fecha=${date}` : ""}`;

  const { supabase, user, members, family } = await getFamily(familyId);
  const visibility = family.is_personal ? "privado" : chosen === "ocupado" ? "ocupado" : "familia";
  const parsed = parseEvent(formData, new Set(members.map((m) => m.id)), {
    visibility,
    responsibleKey: `responsible_${familyId}`,
    participantsKey: `participants_${familyId}`,
  });
  if ("error" in parsed) back(retry, { error: parsed.error! });

  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed.row, family_id: familyId, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) back(retry, { error: "No se pudo guardar. Inténtalo de nuevo." });
  if (parsed.participants.length) {
    await supabase.from("event_participants").insert(parsed.participants.map((member_id) => ({ event_id: data.id, member_id })));
  }
  revalidatePath(`/f/${familyId}`, "layout");
  revalidatePath("/mi", "layout");
  const today = dayKey(new Date());
  const base = family.is_personal ? "/mi" : `/f/${familyId}`;
  const dest = parsed.day === today ? base : `${base}/semana?d=${parsed.day}`;
  const who = family.is_personal ? " · solo tú lo ves" : visibility === "ocupado" ? ` · ${family.name} ve que estás ocupado/a` : ` · ${family.name}`;
  back(dest, { ok: `“${parsed.row.title}” quedó agendado${who}`, link: `/f/${familyId}/e/${data.id}` });
}

export async function updateEvent(familyId: string, eventId: string, formData: FormData) {
  const { supabase, members, family } = await getFamily(familyId);
  const editPath = `/f/${familyId}/e/${eventId}/editar`;

  // Con "¿Quién lo ve?" (solo quien la creó): puede quedarse aquí o cambiar de lugar.
  const destRaw = text(formData, "dest");
  if (destRaw) {
    const [targetId, chosen] = destRaw.split(":");
    if (!/^[0-9a-f-]{36}$/.test(targetId ?? "")) back(editPath, { error: "Elige quién lo ve" });
    if (targetId !== familyId) return moveEvent(familyId, eventId, targetId, chosen, formData);
  }

  const opts = destRaw ? destOpts(familyId, family.is_personal ? "privado" : destRaw.split(":")[1]) : {};
  const parsed = parseEvent(formData, new Set(members.map((m) => m.id)), opts);
  if ("error" in parsed) back(editPath, { error: parsed.error! });

  const { error } = await supabase.from("events").update(parsed.row).eq("id", eventId).eq("family_id", familyId);
  if (error) back(editPath, { error: "No se pudo guardar" });
  await supabase.from("event_participants").delete().eq("event_id", eventId);
  if (parsed.participants.length) {
    await supabase.from("event_participants").insert(parsed.participants.map((member_id) => ({ event_id: eventId, member_id })));
  }
  revalidatePath(`/f/${familyId}`, "layout");
  revalidatePath("/mi", "layout");
  back(`/f/${familyId}/e/${eventId}`, { ok: "Cambios guardados" });
}

function destOpts(familyId: string, chosen: string | undefined): ParseOpts {
  return {
    visibility: chosen === "ocupado" ? "ocupado" : chosen === "privado" ? "privado" : "familia",
    responsibleKey: `responsible_${familyId}`,
    participantsKey: `participants_${familyId}`,
  };
}

/**
 * Pasar una actividad entre "Solo yo" y una familia (o entre familias).
 * La base no deja cambiar family_id, así que se copia al destino (con sus días omitidos) y se borra la original.
 * Los "hecho" y relevos anteriores eran de la otra agenda y no se trasladan.
 */
async function moveEvent(fromId: string, eventId: string, targetId: string, chosen: string | undefined, formData: FormData) {
  const editPath = `/f/${fromId}/e/${eventId}/editar`;
  const [{ supabase, user }, target] = await Promise.all([getFamily(fromId), getFamily(targetId)]);
  const { data: original } = await supabase.from("events").select("created_by, recur_interval").eq("id", eventId).eq("family_id", fromId).maybeSingle();
  if (!original) back(editPath, { error: "No se encontró la actividad" });
  if (original.created_by !== user.id) back(editPath, { error: "Solo quien la creó puede cambiarla de lugar" });

  const opts = destOpts(targetId, target.family.is_personal ? "privado" : chosen);
  const parsed = parseEvent(formData, new Set(target.members.map((m) => m.id)), opts);
  if ("error" in parsed) back(editPath, { error: parsed.error! });

  const { data: created, error } = await supabase
    .from("events")
    .insert({ ...parsed.row, recur_interval: original.recur_interval ?? 1, family_id: targetId, created_by: user.id })
    .select("id")
    .single();
  if (error || !created) back(editPath, { error: "No se pudo cambiar de lugar" });
  const { data: skips } = await supabase.from("event_skips").select("occurrence_start").eq("event_id", eventId);
  await Promise.all([
    parsed.participants.length ? supabase.from("event_participants").insert(parsed.participants.map((member_id) => ({ event_id: created.id, member_id }))) : null,
    skips?.length ? supabase.from("event_skips").insert(skips.map((k) => ({ event_id: created.id, occurrence_start: k.occurrence_start }))) : null,
  ]);
  await supabase.from("events").delete().eq("id", eventId).eq("family_id", fromId);

  revalidatePath(`/f/${fromId}`, "layout");
  revalidatePath(`/f/${targetId}`, "layout");
  revalidatePath("/mi", "layout");
  const where = target.family.is_personal ? "Ahora solo tú lo ves" : opts.visibility === "ocupado" ? `${target.family.name} ve que estás ocupado/a` : `Ahora está en ${target.family.name}`;
  back(`/f/${targetId}/e/${created.id}`, { ok: `Cambios guardados · ${where}` });
}

export async function deleteEvent(familyId: string, eventId: string) {
  const { supabase, family } = await getFamily(familyId);
  const { error, count } = await supabase.from("events").delete({ count: "exact" }).eq("id", eventId).eq("family_id", familyId);
  revalidatePath(`/f/${familyId}`, "layout");
  back(family.is_personal ? "/mi/semana" : `/f/${familyId}/semana`, error || !count ? { error: "No se pudo eliminar" } : { ok: "Eliminado" });
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

// Agregar escribiendo: "Dentista Sofi mañana 16:00". El destino viene del formulario ("Solo yo" o una familia).
export async function quickAdd(from: string, formData: FormData) {
  const raw = text(formData, "q").slice(0, 200);
  const spaceId = text(formData, "space");
  const backTo = safePath(from, "/mi");
  if (!raw) back(backTo, { error: "Escribe qué quieres agendar" });
  if (!/^[0-9a-f-]{36}$/.test(spaceId)) back(backTo, { error: "Elige dónde agregarlo" });

  const { supabase, user, members, me, family } = await getFamily(spaceId);
  const others = family.is_personal ? [] : members.filter((m) => m.id !== me.id);
  const r = parseQuick(raw, dayKey(new Date()), others);
  const { y, m, d } = keyParts(r.date);
  const [sh, sm] = r.start ? r.start.split(":").map(Number) : [0, 0];
  const startsAt = fromLocal(y, m, d, sh, sm);
  let endsAt: Date | null = null;
  if (r.end) {
    const [eh, em] = r.end.split(":").map(Number);
    endsAt = fromLocal(y, m, d, eh, em);
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      family_id: spaceId,
      created_by: user.id,
      title: r.title,
      category: r.category,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt?.toISOString() ?? null,
      all_day: r.allDay,
      visibility: family.is_personal ? "privado" : "familia",
      recurrence: r.recurrence,
      responsible_id: family.is_personal ? null : me.id,
    })
    .select("id")
    .single();
  if (error || !data) back(backTo, { error: "No se pudo agendar. Inténtalo de nuevo." });
  if (r.participantIds.length) {
    await supabase.from("event_participants").insert(r.participantIds.map((member_id) => ({ event_id: data.id, member_id })));
  }
  revalidatePath(`/f/${spaceId}`, "layout");
  revalidatePath("/mi", "layout");
  const repeat = r.recurrence !== "none" ? ` · ${RECURRENCE_LABEL[r.recurrence].toLowerCase()}` : "";
  const where = family.is_personal ? "" : ` · ${family.name}`;
  back(backTo, { ok: `Agendado: ${r.title} · ${formatWhen(startsAt, r.allDay, endsAt)}${repeat}${where}`, link: `/f/${spaceId}/e/${data.id}` });
}
