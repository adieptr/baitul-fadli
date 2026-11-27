import { notFound } from "next/navigation";
import { ReportDetail } from "@/components/reports/report-views";
import { getPublishedReport } from "@/lib/queries/public";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const report = await getPublishedReport((await params).id);
  return { title: report?.title ?? "Laporan Keuangan" };
}

export default async function DonorReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const report = await getPublishedReport((await params).id);
  if (!report) notFound();
  return <ReportDetail report={report} basePath="/akun/laporan" />;
}
