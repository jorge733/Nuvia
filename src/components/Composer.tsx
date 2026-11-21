"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPost } from "@/app/actions";
import type { ProfileLite } from "@/lib/types";
import { Avatar } from "./Avatar";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function Composer({
  profile,
  communities,
  fixedCommunityId,
  placeholder = "¿Qué aprendiste, descubriste o puedes aportar hoy?",
}: {
  profile: ProfileLite;
  communities?: { id: string; name: string }[];
  fixedCommunityId?: string;
  placeholder?: string;
}) {
  const [state, action] = useActionState(createPost, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [showLink, setShowLink] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setPreview(null);
      setShowLink(false);
      setLength(0);
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card space-y-3 p-4 sm:p-5">
      <div className="flex gap-3">
        <Avatar profile={profile} />
        <label className="flex-1">
          <span className="sr-only">Tu aporte</span>
          <textarea
            name="body"
            required
            maxLength={5000}
            rows={3}
            placeholder={placeholder}
            onChange={(e) => setLength(e.target.value.length)}
            className="w-full resize-y bg-transparent text-base outline-none placeholder:text-muted"
          />
        </label>
      </div>

      {preview && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Vista previa" className="max-h-64 rounded-xl border border-line object-cover" />
        </div>
      )}

      {showLink && (
        <input name="link_url" type="url" placeholder="https://…" className="input" aria-label="Enlace" />
      )}

      {fixedCommunityId && <input type="hidden" name="community_id" value={fixedCommunityId} />}

      <FormMessage state={state} />

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <label className="btn-ghost cursor-pointer" title="Agregar imagen">
          🖼️ <span className="hidden sm:inline">Imagen</span>
          <input
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
        <button type="button" className="btn-ghost" onClick={() => setShowLink((v) => !v)} title="Agregar enlace">
          🔗 <span className="hidden sm:inline">Enlace</span>
        </button>
        {!fixedCommunityId && communities && communities.length > 0 && (
          <select name="community_id" className="input w-auto py-1.5 text-sm" aria-label="Publicar en">
            <option value="">General</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <span className="ml-auto text-xs text-muted">{length > 4500 ? `${5000 - length}` : ""}</span>
        <SubmitButton pendingText="Publicando…">Aportar</SubmitButton>
      </div>
    </form>
  );
}
