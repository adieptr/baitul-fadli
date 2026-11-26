import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { AdminMobileMenu, AdminSideNav } from "@/components/layout/admin-nav";
import { requireAdmin } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";

export const metadata = { title: { default: "Admin", template: "%s · Admin Baitul Fadli" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 h-[4.5rem] border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Logo name="Admin" />
            <span className="hidden rounded-full bg-accent-100 px-3 py-1 text-sm font-bold text-accent-700 sm:inline">PENGURUS</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/akun" className="hidden min-h-10 items-center gap-2 rounded-xl px-3 font-semibold text-slate-700 hover:bg-slate-100 md:inline-flex">
              <UserRound className="size-4" aria-hidden /> {admin.fullName.split(" ")[0]}
            </Link>
            <form action={signOutAction}>
              <button className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 font-semibold text-slate-700 hover:bg-slate-100">
                <LogOut className="size-4" aria-hidden /> <span className="hidden sm:inline">Keluar</span>
              </button>
            </form>
            <AdminMobileMenu />
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">
            <AdminSideNav />
          </div>
        </aside>
        <main id="konten" className="min-w-0 flex-1 pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
