"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
  className = "",
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  variant?: "primary" | "ghost";
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${variant === "primary" ? "btn-primary" : "btn-ghost"} ${className}`}>
      {pending ? (pendingText ?? "Un momento…") : children}
    </button>
  );
}
