"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean; match?: string[] };

function useActive() {
  const pathname = usePathname();
  const on = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  return (item: NavItem) => (item.exact ? pathname === item.href : on(item.href) || Boolean(item.match?.some(on)));
}

/** Tab bawah ala aplikasi untuk HP: pil ikon beranimasi + garis trim merah pada tab aktif. */
export function BottomNav({ items }: { items: NavItem[] }) {
  const isActive = useActive();
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(15,33,64,0.06)] backdrop-blur md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="group relative flex min-h-16 flex-col items-center justify-center gap-1 outline-none select-none"
              >
                {/* garis trim merah di atas tab aktif */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-0 h-[3px] w-10 rounded-b-full bg-accent-500 transition-transform duration-300 ease-out",
                    active ? "scale-x-100" : "scale-x-0",
                  )}
                />
                {/* pil ikon */}
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300 ease-out group-active:scale-90",
                    "group-focus-visible:ring-2 group-focus-visible:ring-accent-500",
                    active
                      ? "bg-brand-100 text-brand-800"
                      : "text-slate-500 group-hover:bg-slate-100 group-hover:text-brand-700",
                  )}
                >
                  <item.icon
                    className={cn("size-5 transition-transform duration-300 ease-out", active ? "scale-110 stroke-[2.4]" : "group-hover:scale-105")}
                    aria-hidden
                  />
                </span>
                <span
                  className={cn(
                    "text-[0.72rem] leading-none transition-colors duration-200",
                    active ? "font-bold text-brand-800" : "font-medium text-slate-500 group-hover:text-brand-700",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Tab horizontal untuk tablet/desktop dengan garis bawah beranimasi. */
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
                  "group relative flex min-h-12 items-center gap-2 rounded-t-lg px-4 text-sm font-semibold transition-colors duration-200",
                  active ? "text-brand-800" : "text-slate-600 hover:bg-slate-50 hover:text-brand-700",
                )}
              >
                <item.icon className={cn("size-4 transition-transform duration-200", !active && "group-hover:scale-110")} aria-hidden />
                {item.label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3 bottom-0 h-[3px] rounded-t-full transition-all duration-300 ease-out",
                    active ? "scale-x-100 bg-brand-700" : "scale-x-0 bg-brand-200 group-hover:scale-x-100",
                  )}
                />
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
