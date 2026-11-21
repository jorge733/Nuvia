import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data";
import { AuthForms } from "./AuthForms";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string; next?: string; error?: string }>;
}) {
  const { user } = await getViewer();
  const { modo, next, error } = await searchParams;
  if (user) redirect(next ?? "/");

  return (
    <div className="mx-auto max-w-md py-4 sm:py-10">
      <AuthForms
        initialMode={modo === "registro" ? "signup" : "signin"}
        next={next ?? "/"}
        linkError={
          error === "enlace"
            ? "El enlace expiró o ya fue usado. Intenta entrar de nuevo."
            : error === "google"
              ? "No pudimos conectar con Google."
              : undefined
        }
      />
    </div>
  );
}
