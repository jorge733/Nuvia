import { redirect } from "next/navigation";
import { getMySpaces } from "@/lib/family";
import { isDayKey } from "@/lib/time";

// El "+" de Mi agenda abre directo el formulario personal; arriba se puede cambiar a una familia.
export default async function MiNuevo({ searchParams }: PageProps<"/mi/nuevo">) {
  const sp = await searchParams;
  const { personalId, spaces } = await getMySpaces();
  const target = personalId ?? spaces[0]?.id;
  if (!target) redirect("/crear");
  const hora = typeof sp.hora === "string" && /^\d{2}:\d{2}$/.test(sp.hora) ? sp.hora : null;
  const query = [isDayKey(sp.fecha) ? `fecha=${sp.fecha}` : "", hora ? `hora=${hora}` : ""].filter(Boolean).join("&");
  redirect(`/f/${target}/nuevo${query ? `?${query}` : ""}`);
}
