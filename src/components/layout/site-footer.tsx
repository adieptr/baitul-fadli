import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { SiteSettings } from "@/lib/queries/public";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="mt-16 bg-brand-900 text-brand-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold text-white">{settings.mosque_name}</p>
          {settings.tagline && <p className="mt-1 text-brand-100">{settings.tagline}</p>}
        </div>
        <div className="space-y-2">
          {settings.address && (
            <p className="flex gap-2">
              <MapPin className="mt-1 size-4 shrink-0" aria-hidden /> {settings.address}
            </p>
          )}
          {settings.phone && (
            <p className="flex gap-2">
              <Phone className="mt-1 size-4 shrink-0" aria-hidden />
              <a href={`tel:${settings.phone.replace(/[^0-9+]/g, "")}`} className="underline underline-offset-4">
                {settings.phone}
              </a>
            </p>
          )}
          {settings.email && (
            <p className="flex gap-2">
              <Mail className="mt-1 size-4 shrink-0" aria-hidden />
              <a href={`mailto:${settings.email}`} className="underline underline-offset-4">
                {settings.email}
              </a>
            </p>
          )}
        </div>
        <nav aria-label="Tautan footer" className="flex flex-col gap-2">
          <Link href="/keuangan" className="underline-offset-4 hover:underline">Laporan Keuangan</Link>
          <Link href="/agenda" className="underline-offset-4 hover:underline">Agenda Kegiatan</Link>
          <Link href="/donasi" className="underline-offset-4 hover:underline">Program Donasi</Link>
          <Link href="/daftar" className="underline-offset-4 hover:underline">Daftar Donatur Tetap</Link>
        </nav>
      </div>
      <div className="border-t border-brand-800 py-4 text-center text-sm text-brand-100">
        © {new Date().getFullYear()} {settings.mosque_name}. Dikelola dengan amanah.
      </div>
    </footer>
  );
}
