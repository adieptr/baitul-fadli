import Link from "next/link";
import type { ReactNode } from "react";
import { MosqueInfoButton } from "./mosque-info-dialog";

/** Header ringkas ala aplikasi: logo + nama + tombol info + aksi tambahan. */
export function AppHeader({ name, home, actions }: { name: string; home: string; actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
        <Link href={home} className="flex min-w-0 items-center gap-2.5" aria-label={`${name} — Beranda`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="size-9 rounded-lg" />
          <span className="truncate font-extrabold text-brand-900">{name}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <MosqueInfoButton />
          {actions}
        </div>
      </div>
    </header>
  );
}
