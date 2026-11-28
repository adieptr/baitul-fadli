import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionForm, ConfirmButton, SubmitButton, TextField, TextAreaField } from "@/components/ui/form";
import { BreakdownBars, ReportSummary } from "@/components/public/finance";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { deleteReportAction, publishReportAction, saveReportAction, unpublishReportAction } from "@/lib/actions/admin-finance";
import { formatDate, formatDateTime } from "@/lib/format";
import { jakartaToday } from "@/lib/schedule";
import type { Breakdown } from "@/lib/queries/public";
import { AccountBreakdown, type AccountSummary, type MatrixRow } from "@/components/admin/account-breakdown";

export const metadata = { title: "Detail Laporan" };

export default async function ReportAdminDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: r } = await supabase.from("financial_reports").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const published = r.status === "published";
  const { data: live } = await supabase.rpc("finance_summary", { p_start: r.period_start, p_end: r.period_end });
  const liveSummary = (live ?? {}) as {
    opening_balance: number; total_income: number; total_expense: number; closing_balance: number; breakdown: Breakdown;
    by_account?: AccountSummary[]; matrix?: MatrixRow[];
  };
  const summary = published ? r : liveSummary;
  const canPublish = r.period_end <= jakartaToday();

  return (
    <div className="space-y-6">
      <Link href="/admin/laporan" className="inline-flex min-h-10 items-center gap-2 font-semibold text-brand-800">
        <ArrowLeft className="size-4" aria-hidden /> Semua laporan
      </Link>
      <PageHeader
        title={r.title}
        description={`${formatDate(r.period_start)} – ${formatDate(r.period_end)}`}
        action={<Badge tone={published ? "success" : "warning"}>{published ? `Terbit ${formatDateTime(r.published_at)}` : "Draf (belum terlihat publik)"}</Badge>}
      />

      {!published && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          Angka di bawah adalah <b>pratinjau langsung</b> dari transaksi saat ini. Saat dipublikasikan, angka dikunci sebagai
          snapshot dan transaksi pada periode ini tidak bisa diubah.
        </p>
      )}
      <ReportSummary report={summary} />
      <Card>
        <BreakdownBars breakdown={(published ? r.breakdown : (summary as { breakdown: Breakdown }).breakdown) as Breakdown | null} />
      </Card>

      <AccountBreakdown byAccount={liveSummary.by_account ?? []} matrix={liveSummary.matrix ?? []} />

      {published ? (
        <Card className="space-y-4">
          <a href={`/keuangan/${r.id}`} target="_blank" className="inline-flex items-center gap-2 font-semibold text-brand-800 underline">
            <ExternalLink className="size-4" aria-hidden /> Lihat tampilan publik
          </a>
          <ActionForm action={unpublishReportAction}>
            <input type="hidden" name="id" value={r.id} />
            <ConfirmButton
              label="Batalkan Publikasi"
              variant="danger"
              title="Batalkan publikasi laporan?"
              message="Laporan akan hilang dari halaman publik dan transaksi periode ini dapat dikoreksi kembali. Tindakan ini tercatat di log aktivitas."
              confirmLabel="Batalkan Publikasi"
            >
              <TextAreaField label="Alasan pembatalan" name="reason" rows={2} required placeholder="Contoh: koreksi nominal transaksi listrik" />
            </ConfirmButton>
          </ActionForm>
        </Card>
      ) : (
        <>
          <Card>
            <h2 className="mb-4 text-lg font-bold">Ubah Draf</h2>
            <ActionForm action={saveReportAction} className="grid gap-5 md:grid-cols-2">
              <input type="hidden" name="id" value={r.id} />
              <TextField label="Judul Laporan" name="title" defaultValue={r.title} required className="md:col-span-2" />
              <TextField label="Tanggal Awal" name="period_start" type="date" defaultValue={r.period_start} required />
              <TextField label="Tanggal Akhir" name="period_end" type="date" defaultValue={r.period_end} required />
              <div className="md:col-span-2">
                <TextAreaField label="Catatan untuk Jamaah" name="notes" rows={3} defaultValue={r.notes} maxLength={3000} />
              </div>
              <div>
                <SubmitButton variant="secondary">Simpan Draf</SubmitButton>
              </div>
            </ActionForm>
          </Card>
          <div className="flex flex-wrap gap-3">
            <ActionForm action={publishReportAction}>
              <input type="hidden" name="id" value={r.id} />
              {canPublish ? (
                <ConfirmButton
                  label="Publikasikan Laporan"
                  size="lg"
                  title="Publikasikan laporan ini?"
                  message="Ringkasan laporan (saldo awal, pemasukan, pengeluaran, saldo akhir) akan tampil di halaman publik. Transaksi pada periode ini akan terkunci (tutup buku)."
                  confirmLabel="Ya, Publikasikan"
                />
              ) : (
                <p className="rounded-xl bg-slate-100 p-4 text-slate-700">
                  Laporan dapat dipublikasikan setelah periode berakhir ({formatDate(r.period_end)}).
                </p>
              )}
            </ActionForm>
            <ActionForm action={deleteReportAction}>
              <input type="hidden" name="id" value={r.id} />
              <ConfirmButton label="Hapus Draf" variant="ghost" size="lg" title="Hapus draf laporan?" message="Draf laporan akan dihapus. Transaksi tidak terpengaruh." confirmLabel="Hapus" />
            </ActionForm>
          </div>
        </>
      )}
    </div>
  );
}
