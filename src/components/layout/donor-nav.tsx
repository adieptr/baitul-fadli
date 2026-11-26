"use client";

import { History, House, HandHeart, UserRound } from "lucide-react";
import { BottomNav, TopTabs, type NavItem } from "./app-nav";

const ITEMS: NavItem[] = [
  { href: "/akun", label: "Beranda", icon: House, exact: true },
  { href: "/akun/donasi", label: "Atur Donasi", icon: HandHeart },
  { href: "/akun/riwayat", label: "Riwayat", icon: History },
  { href: "/akun/profil", label: "Profil", icon: UserRound },
];

export function DonorTopTabs() {
  return <TopTabs items={ITEMS} />;
}
export function DonorBottomNav() {
  return <BottomNav items={ITEMS} />;
}
