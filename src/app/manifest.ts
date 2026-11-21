import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Uniluva",
    short_name: "Uniluva",
    description: "Una red social donde el valor de tus aportes importa más que tu popularidad.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fc",
    theme_color: "#6d5dfc",
    categories: ["social", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
