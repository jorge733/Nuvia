"use client";

import { useTransition } from "react";
import { reportPost } from "@/app/actions";

export function ReportButton({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs text-muted hover:text-danger"
      onClick={() => {
        const reason = prompt("¿Por qué reportas este aporte? (spam, acoso, contenido inapropiado…)");
        if (!reason) return;
        startTransition(async () => {
          const res = await reportPost(postId, reason);
          alert(res?.error ?? "Gracias. Revisaremos el reporte.");
        });
      }}
    >
      {pending ? "…" : "Reportar"}
    </button>
  );
}
