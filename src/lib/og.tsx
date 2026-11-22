import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

// Descarga una fuente de Google Fonts en TTF (lo que acepta ImageResponse), solo con los caracteres usados.
async function googleFont(family: string, weight: number, text: string) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1] ?? css.match(/src: url\((.+?)\)/)?.[1];
  if (!url) throw new Error(`No se encontró la fuente ${family}`);
  return fetch(url).then((r) => r.arrayBuffer());
}

const CIRCLES = [
  { x: 150, y: 165, r: 125, c: "#5b3fd9" },
  { x: 290, y: 140, r: 100, c: "#f2763a" },
  { x: 345, y: 300, r: 85, c: "#2fa36b" },
  { x: 215, y: 315, r: 105, c: "#e05298" },
  { x: 75, y: 330, r: 62, c: "#e0a200" },
  { x: 400, y: 55, r: 40, c: "#14a3a3" },
];

export async function renderOg({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  const serifText = `uniluva${title}`;
  const sansText = `${eyebrow}${subtitle}www.uniluva.com`;
  const [serif, sans] = await Promise.all([googleFont("Fraunces", 600, serifText), googleFont("Geist", 500, sansText)]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#faf6f0", position: "relative", fontFamily: "Geist" }}>
        {/* Círculos de la familia */}
        <div style={{ position: "absolute", right: 30, top: 90, width: 470, height: 440, display: "flex" }}>
          {CIRCLES.map((c, i) => (
            <div
              key={i}
              style={{ position: "absolute", left: c.x - c.r, top: c.y - c.r, width: c.r * 2, height: c.r * 2, borderRadius: 9999, background: c.c, opacity: 0.8 }}
            />
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: 700 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["#5b3fd9", "#f2763a", "#2fa36b"].map((c) => (
                <div key={c} style={{ width: 22, height: 22, borderRadius: 9999, background: c }} />
              ))}
            </div>
            <div style={{ fontFamily: "Fraunces", fontSize: 40, color: "#1f1b16" }}>uniluva</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, letterSpacing: 4, color: "#5b3fd9", textTransform: "uppercase" }}>{eyebrow}</div>
            <div style={{ fontFamily: "Fraunces", fontSize: 70, lineHeight: 1.05, color: "#1f1b16", marginTop: 18 }}>{title}</div>
            <div style={{ fontSize: 30, lineHeight: 1.4, color: "#6f675c", marginTop: 22 }}>{subtitle}</div>
          </div>

          <div style={{ fontSize: 24, color: "#8a8278" }}>www.uniluva.com</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Fraunces", data: serif, weight: 600, style: "normal" },
        { name: "Geist", data: sans, weight: 500, style: "normal" },
      ],
    },
  );
}

export const OG_MAIN = {
  eyebrow: "Agenda familiar y personal",
  title: "En tu familia, todos cuentan.",
  subtitle: "Cada cosa con quién se encargue. Relevos, balance del hogar y tu agenda personal.",
};

export const OG_INVITE = {
  eyebrow: "Te invitaron",
  title: "Únete a la agenda de tu familia.",
  subtitle: "Organícense juntos: quién lleva, quién compra, quién va. Todos cuentan.",
};
