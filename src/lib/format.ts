const TZ = "America/Santiago";

export function clp(amount: number | string | null | undefined) {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

export function fecha(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "";
  // Las fechas sin hora (YYYY-MM-DD) se interpretan como fecha local, no UTC.
  const d = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + "T12:00:00") : new Date(value);
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: TZ, ...opts }).format(d);
}

export function fechaHora(value: string | Date | null | undefined) {
  return fecha(value, { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

export function mes(period: string) {
  const s = fecha(period, { day: undefined, month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function whatsappLink(phone: string, text?: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("9")) digits = "56" + digits; // celular chileno sin código de país
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const KIND_LABEL: Record<string, string> = {
  edificio: "Edificio",
  condominio: "Condominio",
  pasaje: "Pasaje",
  vecindario: "Vecindario",
};

export const ROLE_LABEL: Record<string, string> = { admin: "Administración", comite: "Comité", residente: "Vecino/a" };

export const UNIT_WORD: Record<string, string> = {
  edificio: "Departamento",
  condominio: "Casa / depto.",
  pasaje: "Casa (número)",
  vecindario: "Casa (dirección)",
};

export const TICKET_KIND_LABEL: Record<string, string> = {
  reclamo: "Reclamo",
  sugerencia: "Sugerencia",
  consulta_admin: "Mensaje a la administración",
};

export const TICKET_STATUS_LABEL: Record<string, string> = {
  abierto: "Recibido",
  en_revision: "En revisión",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

export const CHARGE_STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  informado: "Pago informado",
  pagado: "Pagado",
};

export const DOC_CATEGORY_LABEL: Record<string, string> = {
  reglamento: "Reglamento",
  actas: "Actas",
  presupuestos: "Presupuestos",
  contratos: "Contratos",
  seguros: "Seguros",
  otros: "Otros",
};
