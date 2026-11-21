import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { deleteAccount, signOut } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { getViewer } from "@/lib/data";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { user, profile } = await getViewer();
  if (!user || !profile) redirect("/entrar?next=/ajustes");

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">Ajustes</h1>
      <ProfileForm profile={profile} />
      <section className="card space-y-2 p-5">
        <h2 className="font-semibold">Tu cuenta</h2>
        <p className="text-sm text-muted">Correo: {user.email}</p>
        <form action={signOut}>
          <button className="btn-ghost">Cerrar sesión</button>
        </form>
      </section>
      <section className="card space-y-2 border-danger/30 p-5">
        <h2 className="font-semibold text-danger">Eliminar cuenta</h2>
        <p className="text-sm text-muted">
          Se borrarán tu perfil, tus aportes, comentarios, reacciones, imágenes y avisos. No se puede deshacer.
        </p>
        {error === "eliminar" && <p className="text-sm text-danger">No pudimos eliminar la cuenta. Intenta de nuevo.</p>}
        <ConfirmButton
          action={deleteAccount}
          confirmText="¿Seguro que quieres eliminar tu cuenta y todo tu contenido? No se puede deshacer."
          className="btn-ghost border-danger/40 text-danger hover:border-danger hover:text-danger"
        >
          Eliminar mi cuenta
        </ConfirmButton>
      </section>
    </div>
  );
}
