import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/card";
import { formatDate, formatRupiah } from "@/lib/format";
import { getPublishedReports } from "@/lib/queries/public";

export const revalidate = 60;
export const metadata = { title: "Laporan Keuangan" };

export default async function ReportsPage() {
  const reports = await getPublishedReports();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="Laporan Keuangan"
        description="Laporan pekanan (Jumat–Kamis) yang telah diperiksa dan dipublikasikan pengurus."
      />
      {reports.length === 0 ? (
        <EmptyState title="Belum ada laporan yang dipublikasikan" />
      ) : (
        <ul className="space-y-4">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`/keuangan/${r.id}`}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-600 hover:shadow-md"
              >
                <FileText className="size-8 shrink-0 text-brand-700" aria-hidden />
                <div className="flex-1">
                  <p className="text-base font-bold text-slate-900">{r.title}</p>
                  <p className="text-slate-600">
                    {formatDate(r.period_start, { short: true })} – {formatDate(r.period_end, { short: true })}
                  </p>
                  <p className="mt-1 text-base">
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
