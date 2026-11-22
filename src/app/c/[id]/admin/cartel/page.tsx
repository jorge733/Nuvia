import { requireManager } from "@/lib/community";
import { inviteLink, qrSvg } from "@/lib/site";
import { PrintButton } from "./print-button";

export const metadata = { title: "Cartel de invitación" };

// Cartel imprimible para el ascensor, la portería o el portón del pasaje.
export default async function Cartel({ params }: PageProps<"/c/[id]/admin/cartel">) {
  const { id } = await params;
  const { community } = await requireManager(id);
  const link = await inviteLink(community.invite_code);
  const svg = await qrSvg(link);

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white text-black">
      <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center px-6 py-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-neutral-500">Vecinos de</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight">{community.name}</h1>
        <p className="mt-6 text-xl">Gastos comunes, reuniones, documentos y reclamos en un solo lugar.</p>
        <div className="mt-8 w-72 sm:w-80" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-6 text-lg">Escanea con la cámara de tu celular</p>
        <p className="mt-2 text-neutral-500">o entra a uniluva.com/unirse con el código</p>
        <p className="mt-1 font-mono text-4xl font-bold tracking-[.3em]">{community.invite_code}</p>
        <p className="mt-10 text-2xl font-bold">
          Uniluva<span className="text-violet-600">.</span>
        </p>
        <PrintButton />
      </div>
    </div>
  );
}
