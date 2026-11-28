import Link from "next/link";
import { Download } from "lucide-react";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { ACCOUNTS, ACCOUNT_SHORT } from "@/lib/accounts";
import { loadLedger, parseLedgerParams } from "@/lib/ledger";
import { formatDate, formatRupiah } from "@/lib/format";
import { jakartaToday } from "@/lib/schedule";
import { cn } from "@/lib/cn";

export const metadata = { title: "Buku Besar" };

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ month?: string; account?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const { month, account, start, end } = parseLedgerParams(sp, jakartaToday());
  const ledger = await loadLedger(account, start, end);
  const exportHref = `/admin/buku-besar/export?month=${month}${account ? `&account=${account}` : ""}`;
  const tabs = [{ id: null, label: "Semua Akun" }, ...ACCOUNTS.map((a) => ({ id: a.id as string | null, label: a.label }))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buku Besar"
        description="Seluruh mutasi kas masjid beserta saldo berjalan, per sumber dana."
        action={
          <Link href={exportHref} prefetch={false} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-800 hover:bg-slate-50">
            <Download className="size-4" aria-hidden /> Unduh CSV
          </Link>
        }
      />

      <Card className="space-y-4">
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Pilih akun">
          {tabs.map((t) => {
            const active = (t.id ?? null) === account;
            return (
              <Link
                key={t.label}
                href={`/admin/buku-besar?month=${month}${t.id ? `&account=${t.id}` : ""}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 shrink-0 items-center rounded-xl border px-4 font-semibold",
                  active ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <form method="get" className="flex flex-wrap items-end gap-3">
          {account && <input type="hidden" name="account" value={account} />}
          <label className="space-y-1">
            <span className="block font-semibold">Bulan</span>
            <input type="month" name="month" defaultValue={month} className="block min-h-10 rounded-xl border border-slate-300 px-3" />
          </label>
          <Button type="submit" variant="secondary">Terapkan</Button>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Saldo Awal" value={formatRupiah(ledger.openingBalance)} />
        <StatCard label="Total Masuk" value={formatRupiah(ledger.totalIncome)} tone="success" />
        <StatCard label="Total Keluar" value={formatRupiah(ledger.totalExpense)} tone="danger" />
        <StatCard label="Saldo Akhir" value={formatRupiah(ledger.closingBalance)} tone="brand" />
      </div>

      {!ledger.rows.length ? (
        <EmptyState title="Belum ada mutasi" description="Tidak ada transaksi pada bulan dan akun yang dipilih." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[44rem] text-left text-base">
            <thead className="bg-slate-50 text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Tanggal</th>
                <th className="px-4 py-3 font-semibold">Keterangan</th>
                <th className="px-4 py-3 font-semibold">Akun</th>
                <th className="px-4 py-3 text-right font-semibold">Masuk</th>
                <th className="px-4 py-3 text-right font-semibold">Keluar</th>
                <th className="px-4 py-3 text-right font-semibold">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-slate-50/60 text-slate-600">
                <td className="px-4 py-2" colSpan={5}>Saldo awal {formatDate(start, { short: true })}</td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatRupiah(ledger.openingBalance)}</td>
              </tr>
              {ledger.rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3">{formatDate(r.transaction_date, { short: true })}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/keuangan/${r.id}`} className="font-medium text-slate-900 hover:underline">{r.description}</Link>
                    <div className="mt-1"><Badge tone={r.type === "income" ? "success" : "danger"}>{r.category_name}</Badge></div>
                  </td>
                  <td className="px-4 py-3"><Badge tone={r.account_id === "bsi" ? "info" : "neutral"}>{ACCOUNT_SHORT[r.account_id] ?? r.account_id}</Badge></td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{r.income ? formatRupiah(r.income) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-700">{r.expense ? formatRupiah(r.expense) : "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatRupiah(r.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td className="px-4 py-3" colSpan={3}>Jumlah bulan ini</td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{formatRupiah(ledger.totalIncome)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-red-700">{formatRupiah(ledger.totalExpense)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(ledger.closingBalance)}</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </div>
  );
}
