export const CATEGORIES: Record<string, { label: string; emoji: string }> = {
  salud: { label: "Salud", emoji: "🩺" },
  colegio: { label: "Colegio", emoji: "🎒" },
  hogar: { label: "Hogar", emoji: "🏠" },
  compras: { label: "Compras", emoji: "🛒" },
  tramites: { label: "Trámites y pagos", emoji: "📄" },
  transporte: { label: "Llevar y traer", emoji: "🚗" },
  celebracion: { label: "Celebración", emoji: "🎉" },
  mascotas: { label: "Mascotas", emoji: "🐾" },
  trabajo: { label: "Trabajo", emoji: "💼" },
  otro: { label: "Otro", emoji: "📌" },
};

// Colores de cada integrante: tonos medios que se leen bien en modo claro y oscuro.
export const MEMBER_COLORS: Record<string, { label: string; hex: string }> = {
  violeta: { label: "Violeta", hex: "#7c5cff" },
  coral: { label: "Coral", hex: "#f2705b" },
  verde: { label: "Verde", hex: "#2fa36b" },
  azul: { label: "Azul", hex: "#3b82f6" },
  ambar: { label: "Ámbar", hex: "#e0a200" },
  rosa: { label: "Rosa", hex: "#e05298" },
  turquesa: { label: "Turquesa", hex: "#14a3a3" },
  gris: { label: "Gris", hex: "#8a8780" },
};

export const KIND_LABEL: Record<string, string> = {
  adulto: "Adulto/a",
  nino: "Niño/a",
  adulto_mayor: "Adulto/a mayor",
  mascota: "Mascota",
};

export const KIND_EMOJI: Record<string, string> = { adulto: "", nino: "", adulto_mayor: "", mascota: "🐾" };

export const VISIBILITY_LABEL: Record<string, { label: string; hint: string }> = {
  familia: { label: "Toda la familia", hint: "Ven los detalles y alguien se encarga" },
  ocupado: { label: "Solo que estoy ocupado/a", hint: "Ven el bloque, sin detalles" },
  privado: { label: "Solo yo", hint: "Nadie más lo ve" },
};

export function whatsappShare(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
