import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Uniluva",
    short_name: "Uniluva",
    description: "Agenda familiar y personal: responsables, relevos y balance del hogar.",
    start_url: "/inicio",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: "#5b3fe0",
    lang: "es-CL",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
