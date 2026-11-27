import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, BellRing, ChevronRight, FileBarChart, HandHeart, ShieldCheck, Wallet } from "lucide-react";
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
      <section className="trim-top lattice-light relative overflow-hidden rounded-2xl bg-brand-900 p-5 text-white shadow-sm sm:p-6">
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
          <Link
            href={`/keuangan/${latest.id}`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white underline-offset-4 hover:underline"
          >
            Lihat rincian laporan <ChevronRight className="size-4" aria-hidden />
          </Link>
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

      {/* Laporan terbaru */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Laporan keuangan</h2>
          {reports.length > 0 && (
            <Link href="/keuangan" className="text-sm font-semibold text-brand-700 hover:underline">
              Semua
            </Link>
          )}
        </div>
        {reports.length ? (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {reports.slice(0, 4).map((r) => (
              <li key={r.id}>
                <Link href={`/keuangan/${r.id}`} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                  <FileBarChart className="size-5 shrink-0 text-brand-700" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{r.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(r.period_start, { short: true })} – {formatDate(r.period_end, { short: true })}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-brand-800 tabular-nums">{formatRupiah(r.closing_balance)}</span>
                  <ChevronRight className="size-4 text-slate-400" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
            Belum ada laporan yang dipublikasikan. Laporan akan tampil di sini setelah diperiksa pengurus.
          </p>
        )}
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
