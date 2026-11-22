import Link from "next/link";

/** Marca de Uniluva: tres círculos que se cruzan (una familia) y el nombre. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="12" cy="13" r="8" fill="#5b3fd9" />
      <circle cx="20" cy="13" r="8" fill="#f2763a" fillOpacity="0.9" />
      <circle cx="16" cy="20" r="8" fill="#2fa36b" fillOpacity="0.85" />
    </svg>
  );
}

export function Logo({ href = "/", size = 26 }: { href?: string; size?: number }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2" aria-label="Uniluva, inicio">
      <LogoMark size={size} />
      <span className="font-display text-xl font-semibold tracking-tight">uniluva</span>
    </Link>
  );
}

/** Ilustración: los colores de una familia entrelazados. */
export function FamilyCircles({ className = "" }: { className?: string }) {
  const circles = [
    { cx: 120, cy: 110, r: 78, c: "#5b3fd9" },
    { cx: 215, cy: 95, r: 62, c: "#f2763a" },
    { cx: 270, cy: 190, r: 52, c: "#2fa36b" },
    { cx: 165, cy: 210, r: 66, c: "#e05298" },
    { cx: 70, cy: 215, r: 40, c: "#e0a200" },
    { cx: 300, cy: 70, r: 26, c: "#14a3a3" },
  ];
  return (
    <svg viewBox="0 0 360 300" className={className} aria-hidden>
      {circles.map((c, i) => (
        <circle key={i} className="circle-float" cx={c.cx} cy={c.cy} r={c.r} fill={c.c} fillOpacity={0.82} style={{ mixBlendMode: "multiply", animationDelay: `${i * -1.3}s`, animationDuration: `${7 + i}s` }} />
      ))}
    </svg>
  );
}
