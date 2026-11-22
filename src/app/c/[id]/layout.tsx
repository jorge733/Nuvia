import Link from "next/link";
import { getCommunity } from "@/lib/community";
import { AppHeader } from "@/components/app-header";
import { CommunityNav } from "@/components/community-nav";

export async function generateMetadata({ params }: LayoutProps<"/c/[id]">) {
  const { id } = await params;
  const { community } = await getCommunity(id);
  return { title: community.name };
}

export default async function CommunityLayout({ children, params }: LayoutProps<"/c/[id]">) {
  const { id } = await params;
  const { community, active, canManage } = await getCommunity(id);

  return (
    <>
      <AppHeader>
        <span className="text-line" aria-hidden>
          /
        </span>
        <Link href="/inicio?lista=1" className="truncate text-sm font-medium text-muted hover:text-fg">
          {community.name}
        </Link>
      </AppHeader>
      {active && <CommunityNav id={id} canManage={canManage} />}
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </>
  );
}
