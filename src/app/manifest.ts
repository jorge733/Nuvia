import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Uniluva",
    short_name: "Uniluva",
    description: "Tu comunidad en un solo lugar: gastos comunes, reuniones, documentos, reclamos y oficios recomendados.",
    start_url: "/inicio",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: "#5b3fe0",
    lang: "es-CL",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
