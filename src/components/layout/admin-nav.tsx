"use client";

import { useState } from "react";
import {
  BookOpen, ClipboardCheck, HandHeart, FileBarChart, History, LayoutDashboard, Menu, Settings,
  Tags, Users, Wallet, X, ShieldCheck,
} from "lucide-react";
import { SideNav, type NavItem } from "./app-nav";

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/pembayaran", label: "Verifikasi Pembayaran", icon: ClipboardCheck },
  { href: "/admin/donasi-lain", label: "Donasi Lain", icon: HandHeart },
  { href: "/admin/donatur", label: "Donatur Tetap", icon: Users },
  { href: "/admin/keuangan", label: "Transaksi Keuangan", icon: Wallet },
  { href: "/admin/buku-besar", label: "Buku Besar", icon: BookOpen },
  { href: "/admin/laporan", label: "Laporan Keuangan", icon: FileBarChart },
  { href: "/admin/kategori", label: "Kategori", icon: Tags },
  { href: "/admin/pengguna", label: "Pengguna & Role", icon: ShieldCheck },
  { href: "/admin/audit", label: "Log Aktivitas", icon: History },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
];

export function AdminSideNav() {
  return <SideNav items={ADMIN_NAV} />;
}

export function AdminMobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="admin-menu"
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 font-semibold"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />} Menu
      </button>
      {open && (
        <div id="admin-menu" className="fixed inset-x-0 top-[4.5rem] bottom-0 z-40 overflow-y-auto bg-white p-4 shadow-xl" onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}>
          <SideNav items={ADMIN_NAV} />
        </div>
      )}
    </div>
  );
}
