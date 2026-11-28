"use client";

import { FileBarChart, History, House, HandHeart, UserRound } from "lucide-react";
import { BottomNav, TopTabs, type NavItem } from "./app-nav";

export const DONOR_NAV_ITEMS: NavItem[] = [
  { href: "/akun", label: "Beranda", icon: House, exact: true },
  { href: "/akun/donasi", label: "Donasi", icon: HandHeart, match: ["/akun/donasi-lain"] },
  { href: "/akun/riwayat", label: "Riwayat", icon: History },
  { href: "/akun/laporan", label: "Laporan", icon: FileBarChart },
  { href: "/akun/profil", label: "Profil", icon: UserRound },
];

export function DonorTopTabs() {
  return <TopTabs items={DONOR_NAV_ITEMS} />;
}
export function DonorBottomNav() {
  return <BottomNav items={DONOR_NAV_ITEMS} />;
}
