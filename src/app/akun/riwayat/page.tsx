import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui/card";
import { PeriodStatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getDonorData } from "@/lib/queries/donor";
import { formatDate, formatDateTime, formatPeriodKey, formatRupiah } from "@/lib/format";

export const metadata = { title: "Riwayat Donasi" };

export default async function HistoryPage() {
  const user = await requireUser("/akun/riwayat");
  const { periods } = await getDonorData(user.id);
  const paid = periods.filter((p) => p.status === "paid");
  const totalPaid = paid.reduce((s, p) => s + Number(p.paid_amount ?? p.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Riwayat Donasi" description="Seluruh tagihan dan status pembayaran Anda." />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total Donasi Terverifikasi" value={formatRupiah(totalPaid)} tone="brand" />
        <StatCard label="Jumlah Periode Lunas" value={`${paid.length} dari ${periods.length}`} />
      </div>
      {periods.length === 0 ? (
        <EmptyState
          title="Belum ada riwayat"
          description="Tagihan pertama akan muncul saat jadwal donasi Anda tiba."
          action={<LinkButton href="/akun/donasi">Atur Donasi</LinkButton>}
        />
      ) : (
        <ul className="space-y-3">
          {periods.map((p) => (
            <li key={p.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-bold">{formatPeriodKey(p.period_key)}</p>
                    <p className="text-slate-600">Jatuh tempo {formatDate(p.due_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold tabular-nums">{formatRupiah(p.status !== "pending" && p.status !== "unpaid" ? (p.paid_amount ?? p.amount) : p.amount)}</p>
                    {p.paid_amount != null && Number(p.paid_amount) !== Number(p.amount) && p.status !== "pending" && p.status !== "unpaid" && (
                      <p className="text-sm text-slate-600">Tagihan {formatRupiah(p.amount)}</p>
                    )}
                    <PeriodStatusBadge status={p.status} />
                  </div>
                </div>
                {(p.donor_confirmed_at || p.verified_at || p.admin_note) && (
                  <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    {p.donor_confirmed_at && <p>Dikonfirmasi: {formatDateTime(p.donor_confirmed_at)}</p>}
                    {p.verified_at && <p>Diverifikasi: {formatDateTime(p.verified_at)}</p>}
                    {p.admin_note && <p>Catatan pengurus: {p.admin_note}</p>}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
