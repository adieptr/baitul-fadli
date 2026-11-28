import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, Banknote, ClipboardCheck, HandHeart, Landmark, Plus, Users, Wallet } from "lucide-react";
import { Card, PageHeader, StatCard, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { PeriodStatusBadge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatDateTime, formatPeriodKey, formatRupiah } from "@/lib/format";
import { jakartaToday } from "@/lib/schedule";

export const metadata = { title: "Dashboard" };

type Stats = {
  balance: number; income_all: number; expense_all: number; income_month: number; expense_month: number;
  active_donors: number; donors_paid_month: number; donors_unpaid_month: number; donors_not_due_month: number;
  awaiting_verification: number; unpaid_total: number;
};

export default async function AdminDashboard() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: statsRaw }, { data: awaiting }, { data: balances }, { count: voluntaryWaiting }] = await Promise.all([
    supabase.rpc("admin_dashboard_stats"),
    supabase
      .from("donation_periods")
      .select("id, period_key, amount, status, donor_confirmed_at, profiles!donation_periods_user_id_fkey(full_name)")
      .eq("status", "awaiting_verification")
      .order("donor_confirmed_at", { ascending: true })
      .limit(5),
    supabase.rpc("get_account_balances"),
    supabase.from("voluntary_donations").select("id", { count: "exact", head: true }).eq("status", "awaiting_verification"),
  ]);
  const totalBalance = (balances ?? []).reduce((sum, b) => sum + Number(b.balance), 0);
  const s = (statsRaw ?? {}) as Partial<Stats>;
  const month = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Ringkasan per ${formatDate(jakartaToday(), { weekday: true })}`}
        action={
          <>
            <LinkButton href="/admin/keuangan/baru">
              <Plus className="size-4" aria-hidden /> Catat Transaksi
            </LinkButton>
          </>
        }
      />

      {(s.awaiting_verification ?? 0) > 0 && (
        <Link
          href="/admin/pembayaran"
          className="flex items-center gap-4 rounded-xl border border-sky-400 bg-sky-50 p-5 hover:bg-sky-100"
        >
          <ClipboardCheck className="size-8 shrink-0 text-sky-700" aria-hidden />
          <div>
            <p className="text-base font-bold text-sky-900">{s.awaiting_verification} pembayaran menunggu verifikasi</p>
            <p className="text-sky-800">Periksa rekening masjid lalu verifikasi →</p>
          </div>
        </Link>
      )}

      {(voluntaryWaiting ?? 0) > 0 && (
        <Link href="/admin/donasi-lain" className="flex items-center gap-4 rounded-xl border border-sky-400 bg-sky-50 p-5 hover:bg-sky-100">
          <HandHeart className="size-8 shrink-0 text-sky-700" aria-hidden />
          <div>
            <p className="text-base font-bold text-sky-900">{voluntaryWaiting} donasi sukarela menunggu verifikasi</p>
            <p className="text-sky-800">Shodaqoh / infaq / wakaf dari donatur →</p>
          </div>
        </Link>
      )}

      <section aria-labelledby="keu">
        <h2 id="keu" className="mb-3 text-lg font-bold">Keuangan</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Saldo" value={formatRupiah(totalBalance)} tone="brand" icon={<Wallet className="size-4" />} hint="Kas tunai + Bank BSI" />
          <StatCard label="Total Pemasukan" value={formatRupiah(s.income_all)} tone="success" icon={<ArrowDownCircle className="size-4" />} hint={`${month}: ${formatRupiah(s.income_month)}`} />
          <StatCard label="Total Pengeluaran" value={formatRupiah(s.expense_all)} tone="danger" icon={<ArrowUpCircle className="size-4" />} hint={`${month}: ${formatRupiah(s.expense_month)}`} />
          <StatCard label={`Selisih ${month}`} value={formatRupiah((s.income_month ?? 0) - (s.expense_month ?? 0))} icon={<Wallet className="size-4" />} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(balances ?? []).map((b) => (
            <Link key={b.id} href={`/admin/buku-besar?account=${b.id}`} className="block rounded-xl focus-visible:ring-2 focus-visible:ring-brand-600">
              <StatCard
                label={`Saldo ${b.name}`}
                value={formatRupiah(b.balance)}
                icon={b.id === "bsi" ? <Landmark className="size-4" /> : <Banknote className="size-4" />}
                hint="Lihat buku besar →"
              />
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="don">
        <h2 id="don" className="mb-3 text-lg font-bold">Donatur Tetap · {month}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Donatur Aktif" value={s.active_donors ?? 0} icon={<Users className="size-4" />} />
          <StatCard label="Sudah Berdonasi" value={s.donors_paid_month ?? 0} tone="success" hint="Semua tagihan bulan ini lunas" />
          <StatCard label="Belum Berdonasi" value={s.donors_unpaid_month ?? 0} tone="danger" hint="Ada tagihan belum lunas" />
          <StatCard label="Belum Jatuh Tempo" value={s.donors_not_due_month ?? 0} tone="neutral" hint="Tagihan bulan ini belum terbentuk" />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <LinkButton href="/admin/donatur?filter=unpaid" variant="secondary" size="sm">
            Lihat donatur yang belum membayar
          </LinkButton>
        </div>
      </section>

      <div className="grid gap-6">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Menunggu Verifikasi</h2>
            <Link href="/admin/pembayaran" className="font-semibold text-brand-800 underline underline-offset-4">Semua</Link>
          </div>
          {awaiting?.length ? (
            <ul className="divide-y divide-slate-100">
              {awaiting.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-semibold">{p.profiles?.full_name}</p>
                    <p className="text-sm text-slate-600">{formatPeriodKey(p.period_key)} · dikonfirmasi {formatDateTime(p.donor_confirmed_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold tabular-nums">{formatRupiah(p.amount)}</span>
                    <PeriodStatusBadge status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Tidak ada pembayaran yang menunggu" />
          )}
        </Card>
      </div>
    </div>
  );
}
