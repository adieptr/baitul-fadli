"use client";

import { FileBarChart, House, UserRound } from "lucide-react";
import { BottomNav, TopTabs, type NavItem } from "./app-nav";

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
