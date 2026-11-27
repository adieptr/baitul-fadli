import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";
import { AppHeader } from "@/components/app/app-header";
import { MosqueInfoDialog } from "@/components/app/mosque-info-dialog";
import { DonorBottomNav, DonorTopTabs } from "@/components/layout/donor-nav";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import { getSiteSettings } from "@/lib/queries/public";
import { mosqueInfoFrom } from "@/lib/mosque-info";

export default async function DonorLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser("/akun"), getSiteSettings()]);
  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <AppHeader
        name={settings.mosque_name}
        home="/akun"
        actions={
          <>
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-accent-100 px-3 text-sm font-semibold text-accent-700"
              >
                <LayoutDashboard className="size-4" aria-hidden /> Admin
              </Link>
            )}
            <form action={signOutAction}>
              <button
                className="inline-flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Keluar"
                title="Keluar"
              >
                <LogOut className="size-5" />
              </button>
            </form>
          </>
        }
      />
      <DonorTopTabs />
      <main id="konten" className="mx-auto max-w-5xl px-4 py-5">
        {children}
      </main>
      <DonorBottomNav />
      <MosqueInfoDialog info={mosqueInfoFrom(settings)} />
    </div>
  );
}
