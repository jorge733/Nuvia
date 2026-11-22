import { familyHubHref, getMySpaces } from "@/lib/family";
import { AppHeader } from "@/components/app-header";
import { PageTransition } from "@/components/page-transition";
import { MyNav } from "@/components/my-nav";

export const metadata = { title: "Mi agenda" };

export default async function MiLayout({ children }: LayoutProps<"/mi">) {
  const { spaces, supabase, user } = await getMySpaces();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const familyHref = familyHubHref(spaces);

  return (
    <>
      <AppHeader userInitial={(profile?.full_name || "Y").charAt(0).toUpperCase()} />
      <MyNav familyHref={familyHref} />
      <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-32 sm:pt-6 sm:pb-16"><PageTransition>{children}</PageTransition></main>
    </>
  );
}
