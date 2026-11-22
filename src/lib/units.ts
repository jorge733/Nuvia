// Convierte "101-104, 201\n12" en ["101","102","103","104","201","12"].
export function parseUnitList(input: string): string[] {
  const out = new Set<string>();
  for (const raw of input.split(/[\n,;]+/)) {
    const part = raw.trim();
    if (!part) continue;
    const range = part.match(/^(\d{1,5})\s*-\s*(\d{1,5})$/);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])];
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      if (hi - lo > 500) continue;
      for (let i = lo; i <= hi; i++) out.add(String(i));
    } else {
      out.add(part.slice(0, 30));
    }
  }
  return [...out];
}
