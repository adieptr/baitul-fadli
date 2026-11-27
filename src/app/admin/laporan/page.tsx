import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionForm, SubmitButton, TextField, TextAreaField } from "@/components/ui/form";
import { Flash } from "@/components/ui/flash";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { saveReportAction } from "@/lib/actions/admin-finance";
import { formatDate, formatRupiah, weekReportTitle } from "@/lib/format";
import { jakartaToday, lastCompletedWeek } from "@/lib/schedule";

export const metadata = { title: "Laporan Keuangan" };

export default async function ReportsAdminPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("financial_reports")
    .select("id, title, period_start, period_end, status, closing_balance, published_at")
    .order("period_end", { ascending: false })
    .limit(100);

  // Laporan pekanan: Jumat s/d Kamis pekan lalu (draf juga dibuat otomatis tiap Jumat pagi)
  const week = lastCompletedWeek(jakartaToday());
  const prevStart = week.start;
  const prevEnd = week.end;
  const prevTitle = weekReportTitle(week.start, week.end);

  return (
    <div className="space-y-6">
      <Flash params={sp} />
      <PageHeader
        title="Laporan Keuangan"
        description="Laporan pekanan (Jumat–Kamis). Draf pekan lalu dibuat otomatis setiap Jumat pagi — periksa, lalu publikasikan."
      />
      <Card>
        <h2 className="mb-4 text-lg font-bold">Buat Laporan Manual</h2>
        <ActionForm action={saveReportAction} className="grid gap-5 md:grid-cols-2">
          <TextField label="Judul Laporan" name="title" defaultValue={prevTitle} required className="md:col-span-2" />
          <TextField label="Tanggal Awal" name="period_start" type="date" defaultValue={prevStart} required />
          <TextField label="Tanggal Akhir" name="period_end" type="date" defaultValue={prevEnd} required />
          <div className="md:col-span-2">
            <TextAreaField label="Catatan untuk Jamaah (opsional)" name="notes" rows={3} maxLength={3000} />
          </div>
          <div>
            <SubmitButton>Buat Draf Laporan</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      {!reports?.length ? (
        <EmptyState title="Belum ada laporan" />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/laporan/${r.id}`} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-600">
                <div className="flex-1">
                  <p className="font-bold">{r.title}</p>
                  <p className="text-sm text-slate-600">
                    {formatDate(r.period_start, { short: true })} – {formatDate(r.period_end, { short: true })}
                    {r.status === "published" && ` · saldo akhir ${formatRupiah(r.closing_balance)}`}
                  </p>
                </div>
                <Badge tone={r.status === "published" ? "success" : "warning"}>{r.status === "published" ? "Terbit" : "Draf"}</Badge>
                <ChevronRight className="size-4 text-slate-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
