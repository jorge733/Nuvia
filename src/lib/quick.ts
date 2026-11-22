// Entiende frases como "Dentista Sofi mañana 16:00" o "Sacar la basura cada lunes 21h".
import { addDays, keyParts, weekday } from "./time";

export type QuickResult = {
  title: string;
  date: string; // YYYY-MM-DD
  start: string | null; // HH:MM
  end: string | null;
  allDay: boolean;
  recurrence: "none" | "diaria" | "dias_habiles" | "semanal" | "mensual" | "anual";
  category: string;
  participantIds: string[];
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pad = (n: number) => String(n).padStart(2, "0");

const WEEKDAYS: Record<string, number> = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const CATEGORY_WORDS: [string, string[]][] = [
  ["salud", ["dentista", "doctor", "doctora", "medico", "medica", "control", "vacuna", "cesfam", "clinica", "kine", "kinesiologo", "examen", "hospital", "pediatra", "farmacia", "remedio", "terapia", "psicologo", "oftalmologo", "consulta"]],
  ["colegio", ["colegio", "apoderados", "tarea", "jardin", "escuela", "prueba", "clases", "liceo", "universidad", "matricula"]],
  ["mascotas", ["veterinario", "veterinaria", "vet", "perro", "gato", "mascota", "pasear"]],
  ["compras", ["comprar", "supermercado", "super", "feria", "compras", "mercado"]],
  ["tramites", ["pagar", "cuenta", "banco", "tramite", "notaria", "permiso", "revision", "impuesto", "sii", "contribuciones", "renovar", "carnet", "pasaporte", "licencia"]],
  ["transporte", ["llevar", "buscar", "traer", "retirar", "recoger", "dejar", "aeropuerto"]],
  ["celebracion", ["cumpleanos", "cumple", "fiesta", "aniversario", "celebracion", "asado", "matrimonio", "bautizo"]],
  ["hogar", ["limpiar", "aseo", "basura", "lavar", "cocinar", "ordenar", "regar", "gasfiter", "electricista", "reparar", "arreglar", "planchar"]],
  ["trabajo", ["reunion", "trabajo", "oficina", "llamada", "entrevista", "presentacion"]],
];

const TRANSPORT_VERBS = new Set(["llevar", "buscar", "traer", "retirar", "recoger", "dejar", "ir"]);

export function guessCategory(title: string) {
  const list = norm(title).split(/[^a-z0-9ñ]+/).filter(Boolean);
  // "Llevar a la Sofi al colegio": la acción manda sobre el lugar.
  if (TRANSPORT_VERBS.has(list[0]) && list.length > 1) return "transporte";
  const words = new Set(list);
  for (const [cat, list] of CATEGORY_WORDS) if (list.some((w) => words.has(w))) return cat;
  return "otro";
}

/** Próxima fecha (incluida hoy) que cae en ese día de la semana. */
function nextWeekday(today: string, wd: number) {
  const diff = (wd - weekday(today) + 7) % 7;
  return addDays(today, diff);
}

function dateFrom(today: string, d: number, m?: number, y?: number) {
  const t = keyParts(today);
  let year = y ?? t.y;
  let month = m ?? t.m;
  const make = () => `${year}-${pad(month)}-${pad(d)}`;
  let key = make();
  if (!y && key < today) {
    if (m) year += 1;
    else {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    key = make();
  }
  const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return d >= 1 && d <= dim ? key : null;
}

function to24(h: number, min: number, ampm?: string) {
  let hh = h;
  if (ampm) {
    const a = ampm.replace(/\./g, "");
    if ((a === "pm" || a === "tarde" || a === "noche") && hh < 12) hh += 12;
    if ((a === "am" || a === "manana" || a === "madrugada") && hh === 12) hh = 0;
  }
  return hh >= 0 && hh < 24 && min >= 0 && min < 60 ? `${pad(hh)}:${pad(min)}` : null;
}

export function parseQuick(input: string, today: string, members: { id: string; name: string }[] = []): QuickResult {
  // Trabajamos sobre una versión normalizada, pero quitamos los mismos tramos del texto original.
  let text = input.replace(/\s+/g, " ").trim();
  let n = norm(text);
  const cut = (re: RegExp) => {
    const m = n.match(re);
    if (!m || m.index === undefined) return null;
    text = (text.slice(0, m.index) + " " + text.slice(m.index + m[0].length)).replace(/\s+/g, " ").trim();
    n = norm(text);
    return m;
  };

  let recurrence: QuickResult["recurrence"] = "none";
  let date: string | null = null;
  let start: string | null = null;
  let end: string | null = null;

  // Repetición
  if (cut(/\b(?:todos los dias|diariamente|diario|cada dia)\b/)) recurrence = "diaria";
  else if (cut(/\b(?:de lunes a viernes|dias habiles|cada dia habil|en la semana)\b/)) recurrence = "dias_habiles";
  else {
    const m = cut(/\b(?:cada|todos los|todas las)\s+(lunes|martes|miercoles|jueves|viernes|sabados?|domingos?)\b/);
    if (m) {
      recurrence = "semanal";
      date = nextWeekday(today, WEEKDAYS[m[1].replace(/^(sabado|domingo)s$/, "$1")]);
    } else if (cut(/\b(?:cada semana|semanal(?:mente)?)\b/)) recurrence = "semanal";
    else if (cut(/\b(?:cada mes|mensual(?:mente)?|todos los meses)\b/)) recurrence = "mensual";
    else if (cut(/\b(?:cada ano|anual(?:mente)?|todos los anos)\b/)) recurrence = "anual";
  }

  // Rango de horas: "de 10 a 12", "10:00-11:30", "de 3 a 5 de la tarde"
  const range = cut(/\b(?:de\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:hrs?|h)?\s*(?:a|-|–|hasta)\s*(?:las\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|hrs?|h|de la (manana|tarde|noche))?\b/);
  if (range && (range[2] || range[4] || range[5] || /\bde\b/.test(range[0]))) {
    const ampm = range[6] ?? (range[5] && !/^h/.test(range[5]) ? range[5] : undefined);
    start = to24(+range[1], +(range[2] ?? 0), ampm);
    end = to24(+range[3], +(range[4] ?? 0), ampm);
    if (start && end && end <= start && !ampm && +range[3] < 12) end = to24(+range[3] + 12, +(range[4] ?? 0));
  } else if (range) {
    // No era un rango de horas (ej. "25-12" como fecha): devolver el texto.
    text = input.replace(/\s+/g, " ").trim();
    n = norm(text);
  }

  // Fecha explícita: 25/12, 25-12-2026, "25 de diciembre", "el 25"
  if (!date) {
    const dm = cut(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
    if (dm) date = dateFrom(today, +dm[1], +dm[2], dm[3] ? (dm[3].length === 2 ? 2000 + +dm[3] : +dm[3]) : undefined);
  }
  if (!date) {
    const dm = cut(/\b(?:el\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de\s+)?(\d{4}))?\b/);
    if (dm) date = dateFrom(today, +dm[1], MONTHS[dm[2]], dm[3] ? +dm[3] : undefined);
  }

  // Hora suelta: "a las 16", "16:30", "16h", "4pm", "10 de la mañana", "mediodía"
  if (!start) {
    if (cut(/\b(?:al\s+)?mediodia\b/)) start = "12:00";
    else {
      const t =
        cut(/\b(?:a\s+las?\s+)(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|hrs?|h|de la (manana|tarde|noche|madrugada))?(?=\s|$|[,.;])/) ??
        cut(/\b(\d{1,2})[:.](\d{2})\s*(am|pm|a\.m\.|p\.m\.|hrs?|h|de la (manana|tarde|noche|madrugada))?(?=\s|$|[,.;])/) ??
        cut(/\b(\d{1,2})()\s*(am|pm|a\.m\.|p\.m\.|hrs|h)(?=\s|$|[,.;])/) ??
        cut(/\b(\d{1,2})()\s*(de la (manana|tarde|noche|madrugada))(?=\s|$|[,.;])/);
      if (t) {
        const ampm = t[4] ?? (t[3] && !/^h/.test(t[3]) ? t[3] : undefined);
        start = to24(+t[1], +(t[2] || 0), ampm);
        // "a las 4" sin am/pm: entre 1 y 7 se entiende de la tarde
        if (start && !ampm && !t[2] && /^a\s/.test(t[0]) && +t[1] >= 1 && +t[1] <= 7) start = to24(+t[1] + 12, 0);
      }
    }
  }

  // Fecha relativa
  if (!date) {
    if (cut(/\bpasado manana\b/)) date = addDays(today, 2);
    else if (cut(/\bmanana\b/)) date = addDays(today, 1);
    else if (cut(/\b(?:hoy|esta (?:tarde|noche|manana))\b/)) date = today;
    else {
      const w = cut(/\b(?:el\s+|este\s+|esta\s+|proximo\s+|proxima\s+)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/);
      if (w) date = nextWeekday(today, WEEKDAYS[w[1]]);
      else {
        const d = cut(/\bel\s+(\d{1,2})\b/);
        if (d) date = dateFrom(today, +d[1]);
      }
    }
  }

  // Limpieza del título: conectores sueltos al final o al inicio
  let title = text.replace(/\s*[,;]\s*$/, "").replace(/(?:\s+(?:el|la|a|las|de|del|en|para|y|por))+$/i, "").replace(/^(?:el|la|a|de)\s+/i, "").trim();
  if (!title) title = input.trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Personas mencionadas en el título ("Dentista Sofi" → para Sofi)
  const tn = norm(title);
  const participantIds = members.filter((m) => m.name.trim().length >= 2 && new RegExp(`\\b${norm(m.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(tn)).map((m) => m.id);

  return {
    title: title.slice(0, 120),
    date: date ?? today,
    start,
    end: start ? end : null,
    allDay: !start,
    recurrence,
    category: guessCategory(title),
    participantIds,
  };
}
