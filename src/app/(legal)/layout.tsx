import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <article className="legal card animate-in mx-auto max-w-2xl p-6 sm:p-8">
      {children}
      <nav className="mt-8 flex flex-wrap gap-4 border-t border-line pt-4 text-sm" aria-label="Documentos legales">
        <Link href="/terminos">Términos de uso</Link>
        <Link href="/privacidad">Política de privacidad</Link>
        <Link href="/normas">Normas de la comunidad</Link>
      </nav>
    </article>
  );
}
