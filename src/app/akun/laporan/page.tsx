import { ReportList } from "@/components/reports/report-views";
import { getPublishedReports } from "@/lib/queries/public";

export const metadata = { title: "Laporan Keuangan" };

/** Laporan di dalam area donatur: menu bawah donatur tidak perlu dimuat ulang. */
export default async function DonorReportsPage() {
  return <ReportList reports={await getPublishedReports()} basePath="/akun/laporan" />;
}
