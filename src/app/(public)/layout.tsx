import { LogIn } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app/app-header";
import { MosqueInfoDialog } from "@/components/app/mosque-info-dialog";
import { PublicBottomNav, PublicTopTabs } from "@/components/layout/public-nav";
import { getSiteSettings } from "@/lib/queries/public";
import { mosqueInfoFrom } from "@/lib/mosque-info";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <AppHeader
        name={settings.mosque_name}
        home="/"
        actions={
          <Link
            href="/masuk"
            className="hidden min-h-10 items-center gap-1.5 rounded-lg bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-800 sm:inline-flex"
          >
            <LogIn className="size-4" aria-hidden /> Masuk
          </Link>
        }
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
