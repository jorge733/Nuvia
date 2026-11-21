"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, signInWithGoogle, signUp } from "@/app/actions";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function AuthForms({
  initialMode,
  next,
  linkError,
}: {
  initialMode: "signin" | "signup";
  next: string;
  linkError?: string;
}) {
  const [mode, setMode] = useState(initialMode);
  const [signInState, signInAction] = useActionState(signIn, linkError ? { error: linkError } : undefined);
  const [signUpState, signUpAction] = useActionState(signUp, undefined);

  return (
    <div className="card animate-in space-y-5 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold">{mode === "signin" ? "Hola de nuevo" : "Únete a Uniluva"}</h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "signin" ? "Entra para aportar y reaccionar." : "Un lugar donde lo que aportas vale más que tu popularidad."}
        </p>
      </div>

      <form action={signInWithGoogle}>
        <button className="btn-ghost w-full py-2.5">
          <span aria-hidden className="font-bold">G</span> Continuar con Google
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> o con tu correo <span className="h-px flex-1 bg-line" />
      </div>

      {mode === "signin" ? (
        <form action={signInAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <label className="block">
            <span className="label">Correo</span>
            <input name="email" type="email" required autoComplete="email" className="input" />
          </label>
          <label className="block">
            <span className="label">Contraseña</span>
            <input name="password" type="password" required autoComplete="current-password" className="input" />
          </label>
          <FormMessage state={signInState} />
          <SubmitButton className="w-full py-2.5" pendingText="Entrando…">
            Entrar
          </SubmitButton>
        </form>
      ) : signUpState?.ok ? (
        <div className="rounded-xl bg-brand/10 p-4 text-sm">
          <p className="font-semibold">Revisa tu correo 📬</p>
          <p className="mt-1 text-muted">Te enviamos un enlace para confirmar tu cuenta. Después podrás entrar.</p>
        </div>
      ) : (
        <form action={signUpAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Tu nombre</span>
              <input name="display_name" required maxLength={60} autoComplete="name" className="input" />
            </label>
            <label className="block">
              <span className="label">Usuario</span>
              <input
                name="username"
                required
                pattern="[a-zA-Z0-9_]{3,24}"
                title="3 a 24 caracteres: letras, números o guion bajo"
                autoComplete="username"
                className="input"
                placeholder="tu_usuario"
              />
            </label>
          </div>
          <label className="block">
            <span className="label">Correo</span>
            <input name="email" type="email" required autoComplete="email" className="input" />
          </label>
          <label className="block">
            <span className="label">Contraseña</span>
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
          </label>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input type="checkbox" name="accept" required className="mt-1 accent-brand" />
            <span>
              Tengo 14 años o más y acepto los{" "}
              <Link href="/terminos" className="text-brand hover:underline">términos</Link> y las{" "}
              <Link href="/normas" className="text-brand hover:underline">normas de la comunidad</Link>.
            </span>
          </label>
          <FormMessage state={signUpState} />
          <SubmitButton className="w-full py-2.5" pendingText="Creando cuenta…">
            Crear cuenta
          </SubmitButton>
        </form>
      )}

      <p className="text-center text-sm text-muted">
        {mode === "signin" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
        <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Crear una" : "Entrar"}
        </button>
      </p>
    </div>
  );
}
