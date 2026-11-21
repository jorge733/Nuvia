"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfile, undefined);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="font-semibold">Perfil</h2>
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-20 rounded-full object-cover" />
        ) : (
          <Avatar profile={profile} size="lg" />
        )}
        <label className="btn-ghost cursor-pointer">
          Cambiar foto
          <input
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
      </div>
      <label className="block">
        <span className="label">Nombre</span>
        <input name="display_name" defaultValue={profile.display_name} required maxLength={60} className="input" />
      </label>
      <label className="block">
        <span className="label">Usuario</span>
        <input name="username" defaultValue={profile.username} required pattern="[a-zA-Z0-9_]{3,24}" className="input" />
      </label>
      <label className="block">
        <span className="label">Biografía</span>
        <textarea name="bio" defaultValue={profile.bio ?? ""} maxLength={280} rows={3} className="input" placeholder="¿En qué puedes aportar?" />
      </label>
      <FormMessage state={state} success="Cambios guardados." />
      <div className="flex justify-end">
        <SubmitButton pendingText="Guardando…">Guardar</SubmitButton>
      </div>
    </form>
  );
}
