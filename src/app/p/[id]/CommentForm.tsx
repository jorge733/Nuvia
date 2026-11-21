"use client";

import { useActionState, useEffect, useRef } from "react";
import { addComment } from "@/app/actions";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function CommentForm({ postId }: { postId: string }) {
  const [state, action] = useActionState(addComment, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="card space-y-2 p-4">
      <input type="hidden" name="post_id" value={postId} />
      <label>
        <span className="sr-only">Tu comentario</span>
        <textarea name="body" required maxLength={2000} rows={2} placeholder="Suma algo a la conversación…" className="w-full resize-y bg-transparent outline-none placeholder:text-muted" />
      </label>
      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingText="Enviando…">Comentar</SubmitButton>
      </div>
    </form>
  );
}
