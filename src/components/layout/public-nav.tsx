"use client";

import Link from "next/link";
import { FileBarChart, House, LogIn, UserRound } from "lucide-react";
import { BottomNav, TopTabs, type NavItem } from "./app-nav";

// Donatur yang sudah login tidak pernah melihat menu ini: proxy mengarahkan
// "/" ke /akun dan "/keuangan" ke /akun/laporan (menu donatur tetap utuh).
const ITEMS: NavItem[] = [
  { href: "/", label: "Beranda", icon: House, exact: true },
  { href: "/keuangan", label: "Laporan", icon: FileBarChart },
  { href: "/akun", label: "Akun", icon: UserRound },
];

export function PublicTopTabs() {
  return <TopTabs items={ITEMS} />;
}
export function PublicBottomNav() {
  return <BottomNav items={ITEMS} />;
}

export function PublicHeaderAction() {
  return (
    <Link
      href="/masuk"
      className="hidden min-h-10 items-center gap-1.5 rounded-lg bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-800 sm:inline-flex"
    >
      <LogIn className="size-4" aria-hidden /> Masuk
    </Link>
  );
}
