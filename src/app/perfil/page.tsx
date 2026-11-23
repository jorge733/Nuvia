import { requireUser } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import { AppHeader } from "@/components/app-header";
import { Field, Flash } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createCalendarLink, renewCalendarLink, saveProfile, setChangeEmail, setDailyEmail } from "./actions";

export const metadata = { title: "Mi perfil" };

export default async function Perfil({ searchParams }: PageProps<"/perfil">) {
  const user = await requireUser();
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: profile }, { data: tokenRow }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, daily_email, change_email").eq("id", user.id).maybeSingle(),
    supabase.from("calendar_tokens").select("token").eq("user_id", user.id).maybeSingle(),
  ]);
  const welcome = sp.bienvenida === "1";
  const feed = tokenRow ? `${(await siteUrl()).replace(/^https?:/, "webcal:")}/api/calendario/${tokenRow.token}` : null;
  const feedHttps = feed?.replace(/^webcal:/, "https:");

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="text-4xl font-semibold">{welcome ? "¡Bienvenido/a a Uniluva!" : "Mi perfil"}</h1>
        <p className="mt-1 text-muted">{welcome ? "¿Cuál es tu nombre?" : user.email}</p>
        <div className="mt-6">
          <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
        </div>
        <form action={saveProfile} className="card space-y-4">
          <input type="hidden" name="welcome" value={welcome ? "1" : ""} />
          <Field label="Nombre y apellido">
            <input className="input" name="full_name" required minLength={2} maxLength={80} defaultValue={profile?.full_name ?? ""} autoComplete="name" />
          </Field>
          {!welcome && (
            <Field label="Teléfono (opcional)">
              <input className="input" name="phone" type="tel" maxLength={30} defaultValue={profile?.phone ?? ""} autoComplete="tel" placeholder="+56 9 1234 5678" />
            </Field>
          )}
          <SubmitButton className="btn-primary w-full">{welcome ? "Continuar" : "Guardar"}</SubmitButton>
        </form>

        {!welcome && (
          <section className="card mt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Resumen diario por correo</h2>
                <p className="mt-1 text-sm text-muted">
                  Cada mañana, entre las 7 y las 8, lo que te toca hoy y los relevos donde tu familia necesita una mano. Solo llega si hay algo.
                </p>
              </div>
            </div>
            <form action={setDailyEmail.bind(null, !profile?.daily_email)} className="mt-4">
              <SubmitButton className={profile?.daily_email ? "btn-secondary w-full" : "btn-primary w-full"} pendingText="…">
                {profile?.daily_email ? "Activado · Desactivar" : "Activar resumen diario"}
              </SubmitButton>
            </form>
          </section>
        )}

        {!welcome && (
          <section className="card mt-6">
            <h2 className="text-xl font-semibold">Avisos de la familia por correo</h2>
            <p className="mt-1 text-sm text-muted">
              Cuando alguien de tu familia agrega o cambia una actividad, pide relevo o toma el que pediste tú. No incluye lo privado ni lo que haces tú.
            </p>
            <form action={setChangeEmail.bind(null, !profile?.change_email)} className="mt-4">
              <SubmitButton className={profile?.change_email ? "btn-secondary w-full" : "btn-primary w-full"} pendingText="…">
                {profile?.change_email ? "Activados · Desactivar" : "Activar avisos de la familia"}
              </SubmitButton>
            </form>
          </section>
        )}

        {!welcome && (
          <section className="card mt-6">
            <h2 className="text-xl font-semibold">Ver Uniluva en tu calendario</h2>
            <p className="mt-1 text-sm text-muted">
              Suscríbete desde Google Calendar o el calendario de tu iPhone y recibe ahí los avisos. Se actualiza solo, cada pocas horas.
            </p>
            {feed ? (
              <div className="mt-4 space-y-3">
                <a href={feed} className="btn-primary w-full">
                  Agregar a mi calendario (iPhone / Mac)
                </a>
                <a
                  href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feed)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary w-full"
                >
                  Agregar a Google Calendar
                </a>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted">Copiar el enlace manualmente</summary>
                  <input className="input mt-2 text-xs" readOnly value={feedHttps} aria-label="Enlace del calendario" />
                  <p className="hint">Este enlace es personal: quien lo tenga puede ver tu agenda, incluidos tus eventos privados.</p>
                </details>
                <form action={renewCalendarLink}>
                  <SubmitButton className="link text-xs" confirm="El enlace actual dejará de funcionar y tendrás que suscribirte de nuevo. ¿Continuar?" pendingText="…">
                    Generar un enlace nuevo
                  </SubmitButton>
                </form>
              </div>
            ) : (
              <form action={createCalendarLink} className="mt-4">
                <SubmitButton className="btn-primary w-full">Crear mi enlace de calendario</SubmitButton>
              </form>
            )}
          </section>
        )}

        {!welcome && (
          <form action="/auth/salir" method="post" className="mt-6">
            <button className="btn-secondary w-full">Cerrar sesión</button>
          </form>
        )}

        <p className="mt-6 text-xs text-muted">Para eliminar tu cuenta y tus datos, escríbenos a privacidad@uniluva.com. Lo hacemos en un máximo de 30 días.</p>
      </main>
    </>
  );
}
