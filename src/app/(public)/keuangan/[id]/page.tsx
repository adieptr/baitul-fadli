import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BreakdownBars, ReportSummary } from "@/components/public/finance";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/format";
import { getPublishedReport, getReportTransactions, type Breakdown } from "@/lib/queries/public";

export const revalidate = 60;
// Render saat pertama diminta lalu di-cache (ISR).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const report = await getPublishedReport((await params).id);
  return { title: report?.title ?? "Laporan Keuangan" };
}

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getPublishedReport(id);
  if (!report) notFound();
  const transactions = await getReportTransactions(id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/keuangan" className="mb-4 inline-flex min-h-10 items-center gap-2 font-semibold text-brand-800">
        <ArrowLeft className="size-4" aria-hidden /> Semua laporan
      </Link>
      <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{report.title}</h1>
      <p className="mt-1 text-base text-slate-600">
        Periode {formatDate(report.period_start)} – {formatDate(report.period_end)}
      </p>
      <p className="mt-1 text-sm text-slate-500">Dipublikasikan {formatDateTime(report.published_at)}</p>

      <div className="mt-6">
        <ReportSummary report={report} />
      </div>

      {report.notes && (
        <Card className="mt-6">
          <h2 className="text-base font-bold">Catatan Pengurus</h2>
          <p className="mt-2 whitespace-pre-line text-slate-700">{report.notes}</p>
        </Card>
      )}

      <Card className="mt-6">
        <BreakdownBars breakdown={report.breakdown as Breakdown | null} />
      </Card>

      <h2 className="mt-10 mb-4 text-lg font-bold">Rincian Transaksi ({transactions.length})</h2>
      {transactions.length === 0 ? (
        <p className="text-slate-600">Tidak ada transaksi pada periode ini.</p>
      ) : (
        <>
          {/* Tampilan kartu untuk HP */}
          <ul className="space-y-3 md:hidden">
            {transactions.map((t) => (
              <li key={t.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{t.description}</p>
                    <p className="text-sm text-slate-600">
                      {formatDate(t.transaction_date, { short: true })} · {t.category_name}
                    </p>
                  </div>
                  <p className={`font-bold tabular-nums ${t.type === "income" ? "text-emerald-700" : "text-red-700"}`}>
                    {t.type === "income" ? "+" : "−"}
                    {formatRupiah(t.amount)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {/* Tabel untuk layar lebar */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-base">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Tanggal</th>
                  <th className="px-3 py-2">Keterangan</th>
                  <th className="px-3 py-2">Kategori</th>
                  <th className="px-3 py-2 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(t.transaction_date, { short: true })}</td>
                    <td className="px-3 py-2">{t.description}</td>
                    <td className="px-3 py-2">
                      <Badge tone={t.type === "income" ? "success" : "danger"}>{t.category_name}</Badge>
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-semibold whitespace-nowrap tabular-nums ${t.type === "income" ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {t.type === "income" ? "+" : "−"}
                      {formatRupiah(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
