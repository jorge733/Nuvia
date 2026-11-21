import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.uniluva.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Uniluva — Conecta. Descubre. Aporta.", template: "%s · Uniluva" },
  description: "Una red social donde el valor de tus aportes importa más que tu popularidad. Conecta. Descubre. Aporta.",
  applicationName: "Uniluva",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  openGraph: {
    title: "Uniluva — Conecta. Descubre. Aporta.",
    description: "Una red social donde el valor de tus aportes importa más que tu popularidad.",
    images: ["/og-image.png"],
    locale: "es_CL",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1017" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh">
        <div className="mx-auto flex max-w-5xl flex-col md:flex-row md:px-4">
          <Nav />
          <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:border-l md:border-line md:px-8 md:pb-10 md:pt-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
