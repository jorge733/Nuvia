import { redirect } from "next/navigation";
import { isDayKey } from "@/lib/time";

// Agregar vive en un solo lugar (/mi/nuevo); desde una familia llega con esa familia ya marcada.
export default async function Nuevo({ params, searchParams }: PageProps<"/f/[id]/nuevo">) {
  const { id } = await params;
  const sp = await searchParams;
  const q = new URLSearchParams({ para: id });
  if (isDayKey(sp.fecha)) q.set("fecha", sp.fecha);
  if (typeof sp.hora === "string" && /^\d{2}:\d{2}$/.test(sp.hora)) q.set("hora", sp.hora);
  redirect(`/mi/nuevo?${q}`);
}
