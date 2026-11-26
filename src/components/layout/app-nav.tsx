"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

function useActive() {
  const pathname = usePathname();
  return (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));
}

/** Tab bawah ala aplikasi untuk HP (ikon besar + label). */
export function BottomNav({ items }: { items: NavItem[] }) {
  const isActive = useActive();
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.8rem] font-semibold",
                  active ? "text-brand-800" : "text-slate-600",
                )}
              >
                <item.icon className={cn("size-5", active && "stroke-[2.5]")} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Tab horizontal untuk tablet/desktop. */
export function TopTabs({ items }: { items: NavItem[] }) {
  const isActive = useActive();
  return (
    <nav aria-label="Navigasi utama" className="hidden border-b border-slate-200 bg-white md:block">
      <ul className="mx-auto flex max-w-5xl gap-1 px-4">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 border-b-4 px-4 font-semibold",
                  active ? "border-brand-700 text-brand-800" : "border-transparent text-slate-600 hover:text-slate-900",
                )}
              >
                <item.icon className="size-4" aria-hidden /> {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Sidebar untuk admin di layar lebar. */
export function SideNav({ items }: { items: NavItem[] }) {
  const isActive = useActive();
  return (
    <nav aria-label="Menu admin" className="space-y-1">
      {items.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-xl px-4 font-semibold",
              active ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-slate-100",
            )}
          >
            <item.icon className="size-4" aria-hidden /> {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
