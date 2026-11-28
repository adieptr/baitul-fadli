import Link from "next/link";
import { ExternalLink, MessageCircle, Phone } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { PeriodStatusBadge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { PaymentDeclared } from "@/components/admin/payment-declared";
import { PeriodActions } from "@/components/admin/period-actions";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { generatePeriodsAction } from "@/lib/actions/admin-donors";
import { signedUrl } from "@/lib/storage";
import { PERIOD_STATUS, formatDate, formatDateTime, formatPeriodKey, formatRupiah, type PeriodStatus } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Verifikasi Pembayaran" };

const TABS: PeriodStatus[] = ["awaiting_verification", "pending", "unpaid", "paid"];

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (TABS as string[]).includes(sp.status ?? "") ? (sp.status as PeriodStatus) : "awaiting_verification";
  const supabase = await createClient();

  const [{ data: periods }, counts] = await Promise.all([
    supabase
      .from("donation_periods")
      .select(
        "id, period_key, due_date, amount, status, donor_note, donor_confirmed_at, proof_path, paid_amount, paid_account, admin_note, verified_at, user_id, profiles!donation_periods_user_id_fkey(full_name, phone, telegram_links(user_id))",
      )
      .eq("status", status)
      .order(status === "paid" ? "verified_at" : "due_date", { ascending: status !== "paid" })
      .limit(100),
    Promise.all(
      TABS.map(async (t) => {
        const { count } = await supabase.from("donation_periods").select("id", { count: "exact", head: true }).eq("status", t);
        return [t, count ?? 0] as const;
      }),
    ),
  ]);
  const countMap = Object.fromEntries(counts);
  const proofUrls = await Promise.all((periods ?? []).map((p) => signedUrl(supabase, "payment-proofs", p.proof_path)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verifikasi Pembayaran"
        description="Cocokkan dengan mutasi rekening masjid sebelum menandai lunas."
        action={
          <ActionForm action={generatePeriodsAction} className="flex flex-col items-end">
            <SubmitButton variant="secondary" size="sm">Buat Tagihan Jatuh Tempo</SubmitButton>
          </ActionForm>
        }
      />
      <nav aria-label="Filter status" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/pembayaran?status=${t}`}
            aria-current={t === status ? "page" : undefined}
            className={cn(
              "flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-4 font-semibold",
              t === status ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700",
            )}
          >
            {PERIOD_STATUS[t].label}
            <span className={cn("rounded-full px-2 text-sm", t === status ? "bg-white/20" : "bg-slate-100")}>{countMap[t]}</span>
          </Link>
        ))}
      </nav>

      {!periods?.length ? (
        <EmptyState title={`Tidak ada data "${PERIOD_STATUS[status].label}"`} />
      ) : (
        <ul className="space-y-4">
          {periods.map((p, i) => {
            const phone = p.profiles?.phone ?? "";
            const wa = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
            return (
              <li key={p.id}>
                <Card className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={`/admin/donatur/${p.user_id}`} className="text-base font-bold hover:underline">
                        {p.profiles?.full_name || "(tanpa nama)"}
                      </Link>
                      <p className="text-slate-600">
                        {formatPeriodKey(p.period_key)} · jatuh tempo {formatDate(p.due_date, { short: true })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold tabular-nums">{formatRupiah(p.amount)}</p>
                      <PeriodStatusBadge status={p.status} />
                    </div>
                  </div>
                  {(p.donor_confirmed_at || p.paid_amount != null || p.donor_note || proofUrls[i] || p.admin_note) && (
                    <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-base">
                      {p.donor_confirmed_at && <p>Dikonfirmasi donatur: {formatDateTime(p.donor_confirmed_at)}</p>}
                      <PaymentDeclared billed={p.amount} paid={p.paid_amount} account={p.paid_account} />
                      {p.donor_note && <p>Catatan donatur: “{p.donor_note}”</p>}
                      {proofUrls[i] && (
                        <a href={proofUrls[i]!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-800 underline">
                          <ExternalLink className="size-4" aria-hidden /> Lihat bukti transfer
                        </a>
                      )}
                      {p.admin_note && <p>Catatan admin: {p.admin_note}</p>}
                      {p.verified_at && <p>Diverifikasi: {formatDateTime(p.verified_at)}</p>}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <PeriodActions period={p} donorName={p.profiles?.full_name ?? ""} hasTelegram={Boolean(p.profiles?.telegram_links)} />
                    {phone && (
                      <div className="flex gap-2">
                        <a href={`tel:${phone}`} className="inline-flex min-h-9 items-center gap-1 rounded-xl px-3 font-semibold text-slate-700 hover:bg-slate-100">
                          <Phone className="size-4" aria-hidden /> Telepon
                        </a>
                        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-xl px-3 font-semibold text-emerald-800 hover:bg-emerald-50">
                          <MessageCircle className="size-4" aria-hidden /> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
