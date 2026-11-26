import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { DonorBottomNav, DonorTopTabs } from "@/components/layout/donor-nav";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";

export default async function DonorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/akun");
  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-2">
          <Logo name="Baitul Fadli" />
          <div className="flex items-center gap-2">
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent-100 px-3 font-semibold text-slate-900"
              >
                <LayoutDashboard className="size-4" aria-hidden /> <span className="hidden sm:inline">Dashboard</span> Admin
              </Link>
            )}
            <form action={signOutAction}>
              <button className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 font-semibold text-slate-700 hover:bg-slate-100">
                <LogOut className="size-4" aria-hidden /> Keluar
              </button>
            </form>
          </div>
        </div>
      </header>
      <DonorTopTabs />
      <main id="konten" className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
      <DonorBottomNav />
    </div>
  );
}
