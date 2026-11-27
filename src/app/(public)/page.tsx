import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, BellRing, ChevronRight, HandHeart, ShieldCheck, Wallet } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { formatDate, formatRupiah } from "@/lib/format";
import { getPublishedReports, getSiteSettings } from "@/lib/queries/public";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export const revalidate = 60;

export default async function PublicDashboard() {
  const [settings, reports] = await Promise.all([getSiteSettings(), getPublishedReports()]);
  const latest = reports[0];

  return (
    <div className="space-y-5">
      <h1 className="sr-only">{settings.mosque_name} — Dasbor</h1>
      {/* Saldo kas — informasi utama */}
      <section className="lattice-light relative overflow-hidden rounded-2xl bg-brand-900 p-5 text-white shadow-sm sm:p-6">
        <p className="text-sm text-brand-100">Assalamu&apos;alaikum · {settings.mosque_name}</p>
        <div className="mt-4 flex items-center gap-2 text-sm text-brand-100">
          <Wallet className="size-4" aria-hidden /> Saldo kas masjid
        </div>
        <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl">
          {latest ? formatRupiah(latest.closing_balance) : "—"}
        </p>
        <p className="mt-1 text-xs text-brand-200">
          {latest ? `Per ${formatDate(latest.period_end)} · ${latest.title}` : "Laporan keuangan pertama sedang disiapkan pengurus"}
        </p>
        {latest && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
              <p className="flex items-center gap-1.5 text-xs text-brand-100">
                <ArrowDownCircle className="size-3.5 text-emerald-300" aria-hidden /> Pemasukan
              </p>
              <p className="mt-0.5 font-bold tabular-nums">{formatRupiah(latest.total_income)}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
              <p className="flex items-center gap-1.5 text-xs text-brand-100">
                <ArrowUpCircle className="size-3.5 text-accent-300" aria-hidden /> Pengeluaran
              </p>
              <p className="mt-0.5 font-bold tabular-nums">{formatRupiah(latest.total_expense)}</p>
            </div>
          </div>
        )}
        {latest && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
            <Link href={`/keuangan/${latest.id}`} className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
              Lihat rincian <ChevronRight className="size-4" aria-hidden />
            </Link>
            {reports.length > 1 && (
              <Link href="/keuangan" className="text-brand-100 underline-offset-4 hover:underline">
                Semua laporan ({reports.length})
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Ajakan jadi donatur */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
            <HandHeart className="size-5" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900">Jadi donatur tetap</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Donasi rutin mingguan atau bulanan, diingatkan otomatis lewat Telegram, dan tercatat transparan.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <LinkButton href="/daftar">Daftar Donatur</LinkButton>
          <LinkButton href="/masuk" variant="secondary">
            Sudah punya akun? Masuk
          </LinkButton>
        </div>
      </section>

      {/* Jaminan singkat */}
      <ul className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-brand-700" aria-hidden /> Laporan diperiksa sebelum dipublikasikan
        </li>
        <li className="flex items-center gap-2">
          <BellRing className="size-4 text-brand-700" aria-hidden /> Pengingat donasi otomatis via Telegram
        </li>
      </ul>
      <InstallPrompt variant="inline" />
    </div>
  );
}
