import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.uniluva.com";
  return ["", "/c", "/terminos", "/privacidad", "/normas"].map((p) => ({ url: `${base}${p}` }));
}
