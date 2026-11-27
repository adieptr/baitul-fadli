import { ReportList } from "@/components/reports/report-views";
import { getPublishedReports } from "@/lib/queries/public";

export const revalidate = 60;
export const metadata = { title: "Laporan Keuangan" };

export default async function ReportsPage() {
  return <ReportList reports={await getPublishedReports()} basePath="/keuangan" />;
}
