import Link from "next/link";
import { familyHubHref, getFamily, getMySpaces } from "@/lib/family";
import { AppHeader } from "@/components/app-header";
import { PageTransition } from "@/components/page-transition";
import { FamilyTabs } from "@/components/family-tabs";
import { MyNav } from "@/components/my-nav";
import { AvatarStack } from "@/components/member-avatar";

export async function generateMetadata({ params }: LayoutProps<"/f/[id]">) {
  const { id } = await params;
  const { family } = await getFamily(id);
  return { title: family.name };
}

export default async function FamilyLayout({ children, params }: LayoutProps<"/f/[id]">) {
  const { id } = await params;
  const [{ family, supabase, members, me }, { spaces }] = await Promise.all([getFamily(id), getMySpaces()]);
  const familyHref = familyHubHref(spaces);
  const main = "mx-auto w-full max-w-3xl lg:max-w-6xl px-4 pt-4 pb-32 sm:pt-6 sm:pb-16";

  // El espacio personal no es "una familia": se ve como parte de Hoy / Calendario.
  if (family.is_personal) {
    return (
      <>
        <AppHeader userInitial={me.name.charAt(0).toUpperCase()} />
        <MyNav familyHref={familyHref} />
        <main className={main}><PageTransition>{children}</PageTransition></main>
      </>
    );
  }
  const { count } = await supabase
    .from("relief_requests")
    .select("id", { count: "exact", head: true })
    .eq("family_id", id)
    .eq("status", "abierto")
    .gte("occurrence_start", new Date().toISOString());
  const familyCount = spaces.filter((s) => !s.isPersonal).length;

  return (
    <>
      <AppHeader userInitial={me.name.charAt(0).toUpperCase()}>
        <Link href={`/f/${id}/familia`} className="hidden min-w-0 items-center gap-2 rounded-full py-1 pr-3 pl-1 transition hover:bg-surface-2 min-[420px]:flex">
          <AvatarStack members={members} size={24} max={4} />
          <span className="truncate text-sm font-semibold text-muted">{family.name}</span>
        </Link>
      </AppHeader>
      <MyNav familyHref={familyHref} addHref={`/mi/nuevo?para=${id}`} />
      <main className={main}>
        <FamilyTabs id={id} name={family.name} openReliefs={count ?? 0} canSwitch={familyCount > 1} />
        <PageTransition>{children}</PageTransition>
      </main>
    </>
  );
}
