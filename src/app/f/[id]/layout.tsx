import Link from "next/link";
import { getFamily } from "@/lib/family";
import { AppHeader } from "@/components/app-header";
import { FamilyNav } from "@/components/family-nav";

export async function generateMetadata({ params }: LayoutProps<"/f/[id]">) {
  const { id } = await params;
  const { family } = await getFamily(id);
  return { title: family.name };
}

export default async function FamilyLayout({ children, params }: LayoutProps<"/f/[id]">) {
  const { id } = await params;
  const { family, supabase } = await getFamily(id);
  const { count } = await supabase
    .from("relief_requests")
    .select("id", { count: "exact", head: true })
    .eq("family_id", id)
    .eq("status", "abierto")
    .gte("occurrence_start", new Date().toISOString());

  return (
    <>
      <AppHeader>
        <span className="text-line" aria-hidden>
          /
        </span>
        <Link href={`/f/${id}`} className="truncate text-sm font-medium text-muted hover:text-fg">
          {family.name}
        </Link>
      </AppHeader>
      <FamilyNav id={id} openReliefs={count ?? 0} />
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 sm:pb-12">{children}</main>
      <Link
        href={`/f/${id}/nuevo`}
        className="fixed right-4 bottom-20 z-30 inline-flex h-14 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-accent-fg shadow-lg transition hover:opacity-90 active:scale-95 sm:bottom-8"
      >
        <span className="text-xl leading-none" aria-hidden>
          ＋
        </span>
        Agregar
      </Link>
    </>
  );
}
