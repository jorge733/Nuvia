"use server";

import { revalidatePath } from "next/cache";
import { back, getFile, requireActive, requireManager, text } from "@/lib/community";
import { uploadFile } from "@/lib/files";

export async function reportPayment(communityId: string, chargeId: string, formData: FormData) {
  const { supabase, user } = await requireActive(communityId);
  const path = `/c/${communityId}/gastos`;
  let receipt: string | null = null;
  try {
    const file = getFile(formData, "receipt");
    if (file) receipt = await uploadFile(supabase, `${communityId}/comprobantes/${user.id}`, file);
  } catch (e) {
    back(path, { error: (e as Error).message });
  }
  const { error } = await supabase.rpc("report_payment", { p_charge_id: chargeId, p_receipt_path: receipt });
  if (error) back(path, { error: "No se pudo informar el pago" });
  revalidatePath(`/c/${communityId}`, "layout");
  back(path, { ok: "Pago informado. La administración lo confirmará." });
}

export async function publishPeriod(communityId: string, formData: FormData) {
  const { supabase, user } = await requireManager(communityId);
  const path = `/c/${communityId}/gastos`;

  const month = text(formData, "period"); // YYYY-MM
  const total = Math.round(Number(text(formData, "total").replace(/[^\d]/g, "")));
  const due = text(formData, "due_date") || null;
  const mode = text(formData, "mode");
  if (!/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(total) || total <= 0) back(path, { error: "Indica el mes y un monto total válido" });

  const { data: units } = await supabase.from("units").select("id, share").eq("community_id", communityId).order("label");
  if (!units?.length) back(`/c/${communityId}/admin`, { error: "Primero agrega las unidades de la comunidad" });

  // Reparto: por prorrateo (si todas las unidades lo tienen) o en partes iguales.
  const useShare = mode === "prorrateo" && units.every((u) => u.share !== null);
  if (mode === "prorrateo" && !useShare) back(path, { error: "No todas las unidades tienen prorrateo. Complétalo en Administrar → Unidades." });
  const shareSum = useShare ? units.reduce((s, u) => s + Number(u.share), 0) : 0;
  const amounts = units.map((u) => (useShare ? Math.round((total * Number(u.share)) / shareSum) : Math.round(total / units.length)));

  let documentPath: string | null = null;
  try {
    const file = getFile(formData, "document");
    if (file) documentPath = await uploadFile(supabase, `${communityId}/gastos`, file);
  } catch (e) {
    back(path, { error: (e as Error).message });
  }

  const { data: period, error } = await supabase
    .from("expense_periods")
    .insert({
      community_id: communityId,
      period: `${month}-01`,
      total_amount: total,
      due_date: due,
      notes: text(formData, "notes") || null,
      document_path: documentPath,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !period) back(path, { error: error?.code === "23505" ? "Ya existe un gasto común para ese mes" : "No se pudo publicar" });

  const { error: chErr } = await supabase
    .from("unit_charges")
    .insert(units.map((u, i) => ({ period_id: period.id, community_id: communityId, unit_id: u.id, amount: amounts[i] })));
  if (chErr) {
    await supabase.from("expense_periods").delete().eq("id", period.id);
    back(path, { error: "No se pudieron crear los cobros por unidad" });
  }

  revalidatePath(`/c/${communityId}`, "layout");
  back(`/c/${communityId}/gastos/${period.id}`, { ok: "Gasto común publicado. Revisa y ajusta los montos si es necesario." });
}

export async function setChargeStatus(communityId: string, periodId: string, chargeId: string, status: "pagado" | "pendiente") {
  const { supabase } = await requireManager(communityId);
  const { error } = await supabase
    .from("unit_charges")
    .update({ status, paid_at: status === "pagado" ? new Date().toISOString() : null })
    .eq("id", chargeId)
    .eq("community_id", communityId);
  revalidatePath(`/c/${communityId}`, "layout");
  back(`/c/${communityId}/gastos/${periodId}`, error ? { error: "No se pudo actualizar" } : { ok: status === "pagado" ? "Pago confirmado" : "Marcado como pendiente" });
}

export async function updateChargeAmount(communityId: string, periodId: string, chargeId: string, formData: FormData) {
  const { supabase } = await requireManager(communityId);
  const amount = Math.round(Number(text(formData, "amount").replace(/[^\d]/g, "")));
  if (!Number.isFinite(amount) || amount < 0) back(`/c/${communityId}/gastos/${periodId}`, { error: "Monto no válido" });
  const { error } = await supabase.from("unit_charges").update({ amount }).eq("id", chargeId).eq("community_id", communityId);
  back(`/c/${communityId}/gastos/${periodId}`, error ? { error: "No se pudo actualizar" } : { ok: "Monto actualizado" });
}

export async function deletePeriod(communityId: string, periodId: string) {
  const { supabase } = await requireManager(communityId);
  const { error } = await supabase.from("expense_periods").delete().eq("id", periodId).eq("community_id", communityId);
  revalidatePath(`/c/${communityId}`, "layout");
  back(`/c/${communityId}/gastos`, error ? { error: "No se pudo eliminar" } : { ok: "Gasto común eliminado" });
}
