import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Permite subir imágenes de hasta 5 MB desde las server actions.
    serverActions: { bodySizeLimit: "6mb" },
  },
  async redirects() {
    // URLs de la versión anterior.
    return [
      { source: "/terminos.html", destination: "/terminos", permanent: true },
      { source: "/privacidad.html", destination: "/privacidad", permanent: true },
      { source: "/normas.html", destination: "/normas", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
