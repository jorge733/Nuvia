import { redirect } from "next/navigation";
import { getMySpaces } from "@/lib/family";
import { isDayKey } from "@/lib/time";

// El "+" de Mi agenda abre directo el formulario personal; arriba se puede cambiar a una familia.
export default async function MiNuevo({ searchParams }: PageProps<"/mi/nuevo">) {
  const sp = await searchParams;
  const { personalId, spaces } = await getMySpaces();
  const target = personalId ?? spaces[0]?.id;
  if (!target) redirect("/crear");
  redirect(`/f/${target}/nuevo${isDayKey(sp.fecha) ? `?fecha=${sp.fecha}` : ""}`);
}
