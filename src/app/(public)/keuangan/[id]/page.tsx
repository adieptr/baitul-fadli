import { notFound } from "next/navigation";
import { ReportDetail } from "@/components/reports/report-views";
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
  return <ReportDetail report={report} basePath="/keuangan" />;
}
