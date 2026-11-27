import { AppHeader } from "@/components/app/app-header";
import { MosqueInfoDialog } from "@/components/app/mosque-info-dialog";
import { PublicBottomNav, PublicHeaderAction, PublicTopTabs } from "@/components/layout/public-nav";
import { getSiteSettings } from "@/lib/queries/public";
import { mosqueInfoFrom } from "@/lib/mosque-info";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <AppHeader
        name={settings.mosque_name}
        home="/"
        actions={<PublicHeaderAction />}
      />
      <PublicTopTabs />
      <main id="konten" className="mx-auto max-w-5xl px-4 py-5">
        {children}
      </main>
      <PublicBottomNav />
      <MosqueInfoDialog info={mosqueInfoFrom(settings)} />
    </div>
  );
}
