"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, UserRound, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";

const NAV = [
  { href: "/", label: "Beranda" },
  { href: "/keuangan", label: "Laporan Keuangan" },
  { href: "/agenda", label: "Agenda" },
  { href: "/donasi", label: "Donasi" },
  { href: "/#kontak", label: "Kontak" },
];

export function SiteHeader({ mosqueName }: { mosqueName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.replace("/#kontak", "#")));

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Logo name={mosqueName} />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Menu utama">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-lg px-3 py-2 text-base font-semibold",
                isActive(n.href) ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-100",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/akun"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand-700 px-4 font-semibold text-white hover:bg-brand-800"
          >
            <UserRound className="size-5" aria-hidden />
            <span className="hidden sm:inline">Akun Saya</span>
            <span className="sm:hidden">Akun</span>
          </Link>
          <button
            className="inline-flex size-12 items-center justify-center rounded-xl border-2 border-slate-200 lg:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="menu-mobile" className="border-t border-slate-200 bg-white px-4 pb-4 lg:hidden" aria-label="Menu utama">
          <ul className="flex flex-col gap-1 pt-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-12 items-center rounded-xl px-4 text-lg font-semibold",
                    isActive(n.href) ? "bg-brand-50 text-brand-800" : "text-slate-800 hover:bg-slate-100",
                  )}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
