"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { back, getFamily, safePath, text, type Member } from "@/lib/family";
import type { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import { notifyEventChange, type EventSnapshot, type Guest } from "@/lib/email/event-change";
import { notifyRelief, type ReliefNotice } from "@/lib/email/relief";
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
  const guests = parseGuests(text(formData, "guests"));
  if ("error" in guests) return guests;

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
    guests: guests.emails,
    day: date,
  } as const;
}

const MAX_GUESTS = 50;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** "ana@x.cl, pedro@y.com" → correos únicos y válidos. */
function parseGuests(raw: string): { emails: string[] } | { error: string } {
  const emails = [...new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const bad = emails.filter((e) => e.length > 254 || !EMAIL.test(e));
  if (bad.length) return { error: `Revisa ${bad.length === 1 ? "este correo" : "estos correos"}: ${bad.slice(0, 3).join(", ")}` };
  if (emails.length > MAX_GUESTS) return { error: `Puedes invitar hasta ${MAX_GUESTS} personas por actividad` };
  return { emails };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;
type GuestRow = Guest & { muted: boolean };

/**
 * Deja los invitados de la actividad igual a `emails`.
 * `previous` son los que tenía; con `copy` (al cambiarla de lugar) se vuelven a crear con su mismo enlace.
 * Devuelve los que se agregaron y los que siguen (y quieren avisos).
 */
async function syncGuests(supabase: Supabase, eventId: string, userId: string, emails: string[], previous: GuestRow[], copy = false, shown?: string[]) {
  const wanted = new Set(emails);
  // Solo se quitan los que estaban en el formulario: quien se sumó con el enlace mientras se editaba, se queda.
  const visible = shown ? new Set(shown) : null;
  const prev = new Map(previous.map((g) => [g.email.toLowerCase(), g]));
  const isRemoved = (g: GuestRow) => !wanted.has(g.email.toLowerCase()) && (!visible || visible.has(g.email.toLowerCase()));
  const kept = previous.filter((g) => !isRemoved(g));
  const removed = previous.filter(isRemoved);
  const toAdd = emails.filter((e) => !prev.has(e));

  if (!copy && removed.length) await supabase.from("event_guests").delete().eq("event_id", eventId).in("token", removed.map((g) => g.token));
  if (copy && kept.length) {
    await supabase.from("event_guests").insert(kept.map((g) => ({ event_id: eventId, email: g.email, token: g.token, muted: g.muted, invited_by: userId })));
  }
  let added: Guest[] = [];
  if (toAdd.length) {
    const { data } = await supabase.from("event_guests").insert(toAdd.map((email) => ({ event_id: eventId, email, invited_by: userId }))).select("email, token");
    added = data ?? [];
  }
  return { added, kept: kept.filter((g) => !g.muted).map(({ email, token }) => ({ email, token })) };
}

type EventRow = {
  title: string;
  category: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  notes?: string | null;
  recurrence: string;
  responsible_id: string | null;
};

function snapshot(row: EventRow, participantIds: string[], byId: Record<string, Member>, guests: string[] = []): EventSnapshot {
  return {
    title: row.title,
    category: row.category,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    all_day: row.all_day,
    location: row.location,
    notes: row.notes ?? null,
    recurrence: row.recurrence,
    responsible: row.responsible_id ? byId[row.responsible_id]?.name ?? null : null,
    participants: participantIds.map((id) => byId[id]?.name).filter((n): n is string => !!n),
    guests,
  };
}

/**
 * Avisa por correo después de responder (no hace esperar a quien guardó):
 * a la familia, si la ve con detalle, y a los invitados.
 */
async function announce(
  familyId: string,
  eventId: string,
  o: { kind: "nuevo" | "cambio" | "cancelado"; event: EventSnapshot; before?: EventSnapshot; family: boolean; guests?: Guest[]; newGuests?: Guest[] },
) {
  const [{ user, me, family }, site] = await Promise.all([getFamily(familyId), siteUrl()]);
  const toFamily = o.family && !family.is_personal;
  if (!toFamily && !o.guests?.length && !o.newGuests?.length) return;
  after(() =>
    notifyEventChange({
      ...o,
      site,
      familyId,
      familyName: family.is_personal ? null : family.name,
      eventId,
      actorId: user.id,
      actorEmail: user.email ?? null,
      actorName: me.name,
      family: toFamily,
      guests: o.guests ?? [],
    }),
  );
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
  const { added } = await syncGuests(supabase, data.id, user.id, parsed.guests, []);
  const { byId } = await getFamily(familyId);
  await announce(familyId, data.id, {
    kind: "nuevo",
    event: snapshot(parsed.row, parsed.participants, byId, parsed.guests),
    family: visibility === "familia",
    newGuests: added,
  });
  revalidatePath(`/f/${familyId}`, "layout");
  revalidatePath("/mi", "layout");
  const today = dayKey(new Date());
  const base = family.is_personal ? "/mi" : `/f/${familyId}`;
  const dest = parsed.day === today ? base : `${base}/semana?d=${parsed.day}`;
  const who = family.is_personal ? " · solo tú lo ves" : visibility === "ocupado" ? ` · ${family.name} ve que estás ocupado/a` : ` · ${family.name}`;
  back(dest, { ok: `“${parsed.row.title}” quedó agendado${who}`, link: `/f/${familyId}/e/${data.id}` });
}

export async function updateEvent(familyId: string, eventId: string, formData: FormData) {
  const { supabase, user, members, family, byId } = await getFamily(familyId);
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

  // Versión anterior, para contarle a la familia qué cambió.
  const { data: old } = await supabase
    .from("events")
    .select("title, category, starts_at, ends_at, all_day, location, notes, recurrence, visibility, responsible_id, event_participants(member_id), event_guests(email, token, muted)")
    .eq("id", eventId)
    .eq("family_id", familyId)
    .maybeSingle();

  const { error } = await supabase.from("events").update(parsed.row).eq("id", eventId).eq("family_id", familyId);
  if (error) back(editPath, { error: "No se pudo guardar" });
  await supabase.from("event_participants").delete().eq("event_id", eventId);
  if (parsed.participants.length) {
    await supabase.from("event_participants").insert(parsed.participants.map((member_id) => ({ event_id: eventId, member_id })));
  }
  const previous = old?.event_guests ?? [];
  const shown = parseGuests(text(formData, "guests_shown"));
  const { added, kept } = await syncGuests(supabase, eventId, user.id, parsed.guests, previous, false, "emails" in shown ? shown.emails : undefined);
  if (old) {
    const event = snapshot(parsed.row, parsed.participants, byId, parsed.guests);
    const before = snapshot(old, old.event_participants.map((p) => p.member_id), byId, previous.map((g) => g.email));
    const toFamily = parsed.row.visibility === "familia";
    // Si antes la familia no la veía (privada u "ocupado"), para ellos es nueva.
    if (toFamily && old.visibility !== "familia") {
      await announce(familyId, eventId, { kind: "nuevo", event, family: true, newGuests: added });
      await announce(familyId, eventId, { kind: "cambio", event, before, family: false, guests: kept });
    } else {
      await announce(familyId, eventId, { kind: "cambio", event, before, family: toFamily, guests: kept, newGuests: added });
    }
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
  const [{ supabase, user, byId }, target] = await Promise.all([getFamily(fromId), getFamily(targetId)]);
  const { data: original } = await supabase
    .from("events")
    .select("created_by, recur_interval, title, category, starts_at, ends_at, all_day, location, notes, recurrence, responsible_id, event_guests(email, token, muted)")
    .eq("id", eventId)
    .eq("family_id", fromId)
    .maybeSingle();
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
  // Los invitados se copian después de borrar la original, para que conserven su mismo enlace.
  const shown = parseGuests(text(formData, "guests_shown"));
  const { added, kept } = await syncGuests(supabase, created.id, user.id, parsed.guests, original.event_guests, true, "emails" in shown ? shown.emails : undefined);
  const event = snapshot(parsed.row, parsed.participants, target.byId, parsed.guests);
  await announce(targetId, created.id, { kind: "nuevo", event, family: opts.visibility === "familia", newGuests: added });
  await announce(targetId, created.id, { kind: "cambio", event, before: snapshot(original, [], byId), family: false, guests: kept });

  revalidatePath(`/f/${fromId}`, "layout");
  revalidatePath(`/f/${targetId}`, "layout");
  revalidatePath("/mi", "layout");
  const where = target.family.is_personal ? "Ahora solo tú lo ves" : opts.visibility === "ocupado" ? `${target.family.name} ve que estás ocupado/a` : `Ahora está en ${target.family.name}`;
  back(`/f/${targetId}/e/${created.id}`, { ok: `Cambios guardados · ${where}` });
}

export async function deleteEvent(familyId: string, eventId: string) {
  const { supabase, family, byId } = await getFamily(familyId);
  // Antes de borrar: los invitados reciben un aviso de que se canceló.
  const { data: old } = await supabase
    .from("events")
    .select("title, category, starts_at, ends_at, all_day, location, notes, recurrence, responsible_id, event_guests(email, token, muted)")
    .eq("id", eventId)
    .eq("family_id", familyId)
    .maybeSingle();
  const { error, count } = await supabase.from("events").delete({ count: "exact" }).eq("id", eventId).eq("family_id", familyId);
  if (!error && count && old) {
    const guests = old.event_guests.filter((g) => !g.muted).map(({ email, token }) => ({ email, token }));
    await announce(familyId, eventId, { kind: "cancelado", event: snapshot(old, [], byId), family: false, guests });
  }
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

/** Avisa por correo de un relevo (pedido → familia; tomado → quien lo pidió), después de responder. */
async function announceRelief(
  familyId: string,
  eventId: string,
  occurrence: string,
  o: { kind: ReliefNotice["kind"]; reason?: string | null; requesterMemberId?: string },
) {
  const [{ supabase, user, me, family }, site] = await Promise.all([getFamily(familyId), siteUrl()]);
  const { data: ev } = await supabase.from("events").select("title, category, location, all_day, starts_at, ends_at").eq("id", eventId).maybeSingle();
  if (!ev || family.is_personal) return;
  const minutes = ev.ends_at ? Math.round((new Date(ev.ends_at).getTime() - new Date(ev.starts_at).getTime()) / 60000) : null;
  after(() =>
    notifyRelief({
      kind: o.kind,
      site,
      familyId,
      familyName: family.name,
      eventId,
      occurrence: new Date(occurrence).toISOString(),
      title: ev.title,
      category: ev.category,
      location: ev.location,
      allDay: ev.all_day,
      minutes,
      reason: o.reason ?? null,
      actorId: user.id,
      actorName: me.name,
      requesterMemberId: o.requesterMemberId,
    }),
  );
}

export async function requestRelief(familyId: string, eventId: string, startIso: string, formData: FormData) {
  const { supabase, me } = await getFamily(familyId);
  const path = `/f/${familyId}/e/${eventId}?o=${encodeURIComponent(startIso)}`;
  const reason = text(formData, "reason").slice(0, 300) || null;
  const { error } = await supabase.from("relief_requests").insert({
    event_id: eventId,
    family_id: familyId,
    occurrence_start: startIso,
    requested_by: me.id,
    reason,
  });
  if (!error) await announceRelief(familyId, eventId, startIso, { kind: "pedido", reason });
  revalidatePath(`/f/${familyId}`, "layout");
  back(path, error ? { error: error.code === "23505" ? "Ya hay un relevo pedido para este día" : "No se pudo pedir el relevo" } : { ok: "Relevo pedido. Le avisamos a tu familia por correo; también puedes escribirles 👇" });
}

export async function takeRelief(familyId: string, reliefId: string, from: string) {
  const { supabase, me } = await getFamily(familyId);
  const { error } = await supabase.rpc("take_relief", { p_relief_id: reliefId });
  if (!error) {
    const { data: r } = await supabase.from("relief_requests").select("event_id, occurrence_start, requested_by").eq("id", reliefId).maybeSingle();
    // Solo a quien lo pidió (y no si se lo toma uno mismo).
    if (r?.requested_by && r.requested_by !== me.id) {
      await announceRelief(familyId, r.event_id, r.occurrence_start, { kind: "tomado", requesterMemberId: r.requested_by });
    }
  }
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

  const row = {
    title: r.title,
    category: r.category,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt?.toISOString() ?? null,
    all_day: r.allDay,
    recurrence: r.recurrence,
    location: null,
    responsible_id: family.is_personal ? null : me.id,
  };
  const { data, error } = await supabase
    .from("events")
    .insert({ ...row, family_id: spaceId, created_by: user.id, visibility: family.is_personal ? "privado" : "familia" })
    .select("id")
    .single();
  if (error || !data) back(backTo, { error: "No se pudo agendar. Inténtalo de nuevo." });
  if (r.participantIds.length) {
    await supabase.from("event_participants").insert(r.participantIds.map((member_id) => ({ event_id: data.id, member_id })));
  }
  if (!family.is_personal) {
    const { byId } = await getFamily(spaceId);
    await announce(spaceId, data.id, { kind: "nuevo", event: snapshot(row, r.participantIds, byId), family: true });
  }
  revalidatePath(`/f/${spaceId}`, "layout");
  revalidatePath("/mi", "layout");
  const repeat = r.recurrence !== "none" ? ` · ${RECURRENCE_LABEL[r.recurrence].toLowerCase()}` : "";
  const where = family.is_personal ? "" : ` · ${family.name}`;
  back(backTo, { ok: `Agendado: ${r.title} · ${formatWhen(startsAt, r.allDay, endsAt)}${repeat}${where}`, link: `/f/${spaceId}/e/${data.id}` });
}

/** Enlace para invitar a la actividad (quien lo abre la ve sin cuenta y puede dejar su correo). */
export async function createShareLink(familyId: string, eventId: string, from: string) {
  const { supabase } = await getFamily(familyId);
  const { error } = await supabase.from("events").update({ share_token: randomBytes(20).toString("hex") }).eq("id", eventId).eq("family_id", familyId);
  back(safePath(from, `/f/${familyId}/e/${eventId}`), error ? { error: "No se pudo crear el enlace" } : { ok: "Enlace creado. Compártelo con quien quieras invitar." });
}

/** Desactivar el enlace: deja de funcionar (quienes ya se sumaron siguen invitados). */
export async function disableShareLink(familyId: string, eventId: string, from: string) {
  const { supabase } = await getFamily(familyId);
  const { error } = await supabase.from("events").update({ share_token: null }).eq("id", eventId).eq("family_id", familyId);
  back(safePath(from, `/f/${familyId}/e/${eventId}`), error ? { error: "No se pudo desactivar el enlace" } : { ok: "Enlace desactivado" });
}
