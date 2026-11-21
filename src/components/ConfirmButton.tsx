"use client";

import { useTransition } from "react";

export function ConfirmButton({
  action,
  confirmText,
  children,
  className = "text-xs text-muted hover:text-danger",
}: {
  action: () => Promise<void>;
  confirmText: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (confirm(confirmText)) startTransition(() => action());
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}
