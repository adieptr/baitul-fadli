import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ReportSummary } from "@/components/public/finance";
import { formatDate, formatDateTime } from "@/lib/format";
import { getPublishedReport } from "@/lib/queries/public";

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
  const report = await getPublishedReport((await params).id);
  if (!report) notFound();

  return (
    <div className="space-y-5">
      <Link href="/keuangan" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-800">
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
