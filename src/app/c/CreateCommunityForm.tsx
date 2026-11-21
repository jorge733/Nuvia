"use client";

import { useActionState, useState } from "react";
import { createCommunity } from "@/app/actions";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { slugify } from "@/lib/format";

export function CreateCommunityForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [state, action] = useActionState(createCommunity, undefined);

  if (!open) {
    return (
      <button className="btn-ghost w-full border-dashed py-3" onClick={() => setOpen(true)}>
        ＋ Crear una comunidad
      </button>
    );
  }

  return (
    <form action={action} className="card animate-in space-y-3 p-4 sm:p-5">
      <label className="block">
        <span className="label">Nombre</span>
        <input name="name" required minLength={3} maxLength={60} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Huertos urbanos" />
      </label>
      {name && <p className="text-xs text-muted">Dirección: uniluva.com/c/{slugify(name) || "…"}</p>}
      <label className="block">
        <span className="label">Descripción</span>
        <textarea name="description" maxLength={300} rows={2} className="input" placeholder="¿De qué se trata y qué tipo de aportes esperan?" />
      </label>
      <FormMessage state={state} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <SubmitButton pendingText="Creando…">Crear comunidad</SubmitButton>
      </div>
    </form>
  );
}
