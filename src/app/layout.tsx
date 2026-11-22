import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz", "SOFT"] });

export const metadata: Metadata = {
  title: { default: "Uniluva — Agenda familiar", template: "%s · Uniluva" },
  description: "La agenda familiar y personal donde cada cosa tiene quién se encargue y todos cuentan.",
  applicationName: "Uniluva",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.uniluva.com"),
  openGraph: {
    type: "website",
    siteName: "Uniluva",
    locale: "es_CL",
    title: "Uniluva — En tu familia, todos cuentan",
    description: "La agenda familiar y personal donde cada cosa tiene quién se encargue. Relevos, balance del hogar y tu agenda personal.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Uniluva — En tu familia, todos cuentan",
    description: "La agenda familiar y personal donde cada cosa tiene quién se encargue.",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6f0" },
    { media: "(prefers-color-scheme: dark)", color: "#15120f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
