import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Lock } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/card";
import { ActionForm, ConfirmButton } from "@/components/ui/form";
import { TransactionForm } from "@/components/admin/transaction-form";
import { AuditTimeline } from "@/components/admin/audit-timeline";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { getCategories, getLockedRanges, isLocked } from "@/lib/queries/admin";
import { deleteTransactionAction } from "@/lib/actions/admin-finance";
import { signedUrl } from "@/lib/storage";
import { jakartaToday } from "@/lib/schedule";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Detail Transaksi" };

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: tx } = await supabase
    .from("transactions")
    .select("*, creator:profiles!transactions_created_by_fkey(full_name), updater:profiles!transactions_updated_by_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!tx) notFound();

  const [categories, ranges, proofUrl, { data: history }] = await Promise.all([
    getCategories(),
    getLockedRanges(),
    signedUrl(supabase, "transaction-proofs", tx.proof_path),
    supabase
      .from("audit_logs")
      .select("id, action, details, created_at, profiles(full_name)")
      .eq("entity", "transactions")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const locked = isLocked(tx.transaction_date, ranges);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/keuangan" className="inline-flex min-h-10 items-center gap-2 font-semibold text-brand-800">
        <ArrowLeft className="size-4" aria-hidden /> Kembali
      </Link>
      <PageHeader
        title="Detail Transaksi"
        description={`Dicatat oleh ${tx.creator?.full_name ?? "-"} · ${formatDateTime(tx.created_at)}${tx.updated_at !== tx.created_at ? ` · diubah ${tx.updater?.full_name ?? ""} ${formatDateTime(tx.updated_at)}` : ""}`}
      />
      {locked && (
        <div className="flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4">
          <Lock className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            Transaksi ini berada dalam periode laporan yang <b>sudah dipublikasikan</b> sehingga terkunci. Untuk mengoreksi,
            batalkan publikasi laporan terkait di menu <Link href="/admin/laporan" className="font-semibold underline">Laporan Keuangan</Link>.
          </p>
        </div>
      )}
      {tx.donation_period_id && (
        <p className="rounded-xl border border-sky-300 bg-sky-50 p-4 text-sky-900">
          Transaksi ini dibuat otomatis saat verifikasi pembayaran donatur tetap.
        </p>
      )}
      <Card>
        <TransactionForm
          categories={categories}
          today={jakartaToday()}
          locked={locked || Boolean(tx.donation_period_id)}
          proofUrl={proofUrl}
          initial={{
            id: tx.id,
            type: tx.type,
            category_id: tx.category_id,
            amount: Number(tx.amount),
            transaction_date: tx.transaction_date,
            description: tx.description,
            proof_path: tx.proof_path,
          }}
        />
        {proofUrl && (
          <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 font-semibold text-brand-800 underline">
            <ExternalLink className="size-4" aria-hidden /> Buka bukti transaksi
          </a>
        )}
      </Card>
      {!locked && !tx.donation_period_id && (
        <ActionForm action={deleteTransactionAction}>
          <input type="hidden" name="id" value={tx.id} />
          <ConfirmButton
            label="Hapus Transaksi"
            variant="danger"
            title="Hapus transaksi ini?"
            message="Transaksi akan dihapus permanen. Jejak penghapusan tetap tersimpan di log aktivitas."
            confirmLabel="Ya, Hapus"
          />
        </ActionForm>
      )}
      <Card>
        <h2 className="mb-4 text-lg font-bold">Riwayat Perubahan</h2>
        <AuditTimeline entries={history ?? []} />
      </Card>
    </div>
  );
}
