import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/ajustes", "/notificaciones", "/auth/"] },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.uniluva.com"}/sitemap.xml`,
  };
}
