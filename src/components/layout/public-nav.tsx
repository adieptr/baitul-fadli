"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { FileBarChart, House, LogIn, UserRound } from "lucide-react";
import { BottomNav, TopTabs, type NavItem } from "./app-nav";
import { DONOR_NAV_ITEMS } from "./donor-nav";

const PUBLIC_ITEMS: NavItem[] = [
  { href: "/", label: "Beranda", icon: House, exact: true },
  { href: "/keuangan", label: "Laporan", icon: FileBarChart },
  { href: "/akun", label: "Akun", icon: UserRound },
];

/**
 * Halaman publik (mis. Laporan) bisa dibuka donatur yang sudah login. Agar
 * navigasinya tetap menu donatur, cek keberadaan cookie sesi Supabase
 * (sb-…-auth-token). Hanya untuk tampilan — keamanan tetap di server.
 */
function subscribe() {
  return () => {};
}
function hasSession() {
  return /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/.test(document.cookie);
}
function useLoggedIn() {
  return useSyncExternalStore(subscribe, hasSession, () => false);
}

export function PublicTopTabs() {
  return <TopTabs items={useLoggedIn() ? DONOR_NAV_ITEMS : PUBLIC_ITEMS} />;
}
export function PublicBottomNav() {
  return <BottomNav items={useLoggedIn() ? DONOR_NAV_ITEMS : PUBLIC_ITEMS} />;
}

export function PublicHeaderAction() {
  const loggedIn = useLoggedIn();
  return (
    <Link
      href={loggedIn ? "/akun" : "/masuk"}
      className="hidden min-h-10 items-center gap-1.5 rounded-lg bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-800 sm:inline-flex"
    >
      {loggedIn ? <UserRound className="size-4" aria-hidden /> : <LogIn className="size-4" aria-hidden />}
      {loggedIn ? "Akun Saya" : "Masuk"}
    </Link>
  );
}
