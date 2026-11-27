import Link from "next/link";
import { ArrowLeft, ChevronRight, FileText, ShieldCheck } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ReportSummary } from "@/components/public/finance";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/format";
import type { ReportRow } from "@/lib/queries/public";

/** Daftar laporan terbit — dipakai halaman publik (/keuangan) dan donatur (/akun/laporan). */
export function ReportList({ reports, basePath }: { reports: ReportRow[]; basePath: string }) {
  return (
    <div>
      <PageHeader
        title="Laporan Keuangan"
        description="Laporan pekanan (Jumat–Kamis) yang telah diperiksa dan dipublikasikan pengurus."
      />
      {reports.length === 0 ? (
        <EmptyState title="Belum ada laporan yang dipublikasikan" />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`${basePath}/${r.id}`}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-600"
              >
                <FileText className="size-7 shrink-0 text-brand-700" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{r.title}</p>
                  <p className="text-sm text-slate-600">
                    {formatDate(r.period_start, { short: true })} – {formatDate(r.period_end, { short: true })}
                  </p>
                  <p className="mt-1 text-sm">
                    Saldo akhir: <b className="text-brand-800 tabular-nums">{formatRupiah(r.closing_balance)}</b>
                  </p>
                </div>
                <ChevronRight className="size-5 text-slate-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Detail laporan: hanya saldo awal, pemasukan, pengeluaran, saldo akhir. */
export function ReportDetail({ report, basePath }: { report: ReportRow; basePath: string }) {
  return (
    <div className="space-y-5">
      <Link href={basePath} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-800">
        <ArrowLeft className="size-4" aria-hidden /> Semua laporan
      </Link>
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{report.title}</h1>
        <p className="mt-1 text-slate-600">
          {formatDate(report.period_start, { weekday: true })} – {formatDate(report.period_end, { weekday: true })}
        </p>
      </div>
      <ReportSummary report={report} />
      {report.notes && (
        <Card>
          <h2 className="font-bold">Catatan Pengurus</h2>
          <p className="mt-2 whitespace-pre-line text-slate-700">{report.notes}</p>
        </Card>
      )}
      <p className="flex items-start gap-2 text-sm text-slate-500">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
        Diperiksa dan dipublikasikan pengurus pada {formatDateTime(report.published_at)}. Rincian transaksi tersimpan di
        pengurus dan dapat ditanyakan langsung.
      </p>
    </div>
  );
}
