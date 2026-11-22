import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Uniluva",
    short_name: "Uniluva",
    description: "Agenda familiar y personal: responsables, relevos y balance del hogar.",
    start_url: "/inicio",
    display: "standalone",
    background_color: "#faf6f0",
    theme_color: "#5b3fd9",
    lang: "es-CL",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
