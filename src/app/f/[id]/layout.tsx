import Link from "next/link";
import { getFamily } from "@/lib/family";
import { AppHeader } from "@/components/app-header";
import { FamilyNav } from "@/components/family-nav";
import { MyNav } from "@/components/my-nav";
import { AvatarStack } from "@/components/member-avatar";

export async function generateMetadata({ params }: LayoutProps<"/f/[id]">) {
  const { id } = await params;
  const { family } = await getFamily(id);
  return { title: family.name };
}

export default async function FamilyLayout({ children, params }: LayoutProps<"/f/[id]">) {
  const { id } = await params;
  const { family, supabase, members, me } = await getFamily(id);
  if (family.is_personal) {
    return (
      <>
        <AppHeader userInitial={me.name.charAt(0).toUpperCase()} />
        <MyNav familyHref="/inicio?lista=1" />
        <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-32 sm:pt-6 sm:pb-16">{children}</main>
      </>
    );
  }
  const { count } = await supabase
    .from("relief_requests")
    .select("id", { count: "exact", head: true })
    .eq("family_id", id)
    .eq("status", "abierto")
    .gte("occurrence_start", new Date().toISOString());

  return (
    <>
      <AppHeader userInitial={me.name.charAt(0).toUpperCase()}>
        <Link href={`/f/${id}/familia`} className="hidden min-w-0 items-center gap-2 rounded-full py-1 pr-3 pl-1 transition hover:bg-surface-2 min-[420px]:flex">
          <AvatarStack members={members} size={24} max={4} />
          <span className="truncate text-sm font-semibold text-muted">{family.name}</span>
        </Link>
      </AppHeader>
      <FamilyNav id={id} openReliefs={count ?? 0} />
      <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-32 sm:pt-6 sm:pb-16">{children}</main>
    </>
  );
}
