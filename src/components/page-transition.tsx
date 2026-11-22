"use client";

import { ViewTransition } from "react";
import { usePathname } from "next/navigation";

/** Al cambiar de página, el contenido sale rápido y el nuevo entra suave; encabezado y barra quedan quietos. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page-in" exit="page-out" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
