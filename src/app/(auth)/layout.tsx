import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pattern-bg min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-6 inline-flex min-h-12 items-center gap-2 font-semibold text-white">
          <ArrowLeft className="size-5" aria-hidden /> Kembali ke Beranda
        </Link>
        <main id="konten" className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" className="size-12 rounded-xl" />
            <span className="text-lg font-extrabold text-brand-900">Masjid Baitul Fadli</span>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
