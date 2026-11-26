import Link from "next/link";
import { Lock, Plus, Paperclip } from "lucide-react";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui/card";
import { LinkButton, Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Flash } from "@/components/ui/flash";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { getCategories, getLockedRanges, isLocked } from "@/lib/queries/admin";
import { formatDate, formatRupiah } from "@/lib/format";
import { jakartaToday } from "@/lib/schedule";

export const metadata = { title: "Transaksi Keuangan" };
const PAGE_SIZE = 25;

type SP = { month?: string; type?: string; category?: string; q?: string; page?: string; saved?: string; deleted?: string };

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
}

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : jakartaToday().slice(0, 7);
  const type = sp.type === "income" || sp.type === "expense" ? sp.type : undefined;
  const category = /^[0-9a-f-]{36}$/.test(sp.category ?? "") ? sp.category : undefined;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Number(sp.page) || 1);
  const { start, end } = monthRange(month);

  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select("id, type, amount, transaction_date, description, proof_path, donation_period_id, categories(name)", { count: "exact" })
    .gte("transaction_date", start)
    .lte("transaction_date", end)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (type) query = query.eq("type", type);
  if (category) query = query.eq("category_id", category);
  if (q) query = query.ilike("description", `%${q.replace(/[%_\\]/g, "\\$&")}%`);

  const [{ data: rows, count }, { data: summary }, categories, locked] = await Promise.all([
    query,
    supabase.rpc("finance_summary", { p_start: start, p_end: end }),
    getCategories(),
    getLockedRanges(),
  ]);
  const s = (summary ?? {}) as { opening_balance?: number; total_income?: number; total_expense?: number; closing_balance?: number };

  return (
    <div>
      <Flash params={sp} />
      <PageHeader
        title="Transaksi Keuangan"
        description="Catat setiap pemasukan dan pengeluaran masjid."
        action={
          <LinkButton href="/admin/keuangan/baru">
            <Plus className="size-4" aria-hidden /> Catat Transaksi
          </LinkButton>
        }
      />

      <Card className="mb-6">
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" method="get">
          <label className="space-y-1">
            <span className="block font-semibold">Bulan</span>
            <input type="month" name="month" defaultValue={month} className="block min-h-10 w-full rounded-xl border border-slate-300 px-3" />
          </label>
          <label className="space-y-1">
            <span className="block font-semibold">Jenis</span>
            <select name="type" defaultValue={type ?? ""} className="block min-h-10 w-full rounded-xl border border-slate-300 px-3">
              <option value="">Semua</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block font-semibold">Kategori</span>
            <select name="category" defaultValue={category ?? ""} className="block min-h-10 w-full rounded-xl border border-slate-300 px-3">
              <option value="">Semua</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.type === "income" ? "↓" : "↑"} {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block font-semibold">Cari keterangan</span>
            <input name="q" defaultValue={q} className="block min-h-10 w-full rounded-xl border border-slate-300 px-3" />
          </label>
          <div className="flex items-end">
            <Button type="submit" variant="secondary" className="w-full">Terapkan</Button>
          </div>
        </form>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo Awal Bulan" value={formatRupiah(s.opening_balance)} />
        <StatCard label="Pemasukan" value={formatRupiah(s.total_income)} tone="success" />
        <StatCard label="Pengeluaran" value={formatRupiah(s.total_expense)} tone="danger" />
        <StatCard label="Saldo Akhir Bulan" value={formatRupiah(s.closing_balance)} tone="brand" />
      </div>

      {!rows?.length ? (
        <EmptyState title="Tidak ada transaksi" description="Coba ubah filter atau catat transaksi baru." />
      ) : (
        <ul className="space-y-3">
          {rows.map((t) => {
            const lockedRow = isLocked(t.transaction_date, locked);
            return (
              <li key={t.id}>
                <Link
                  href={`/admin/keuangan/${t.id}`}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-600"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{t.description}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span>{formatDate(t.transaction_date, { short: true })}</span>
                      <Badge tone={t.type === "income" ? "success" : "danger"}>{t.categories?.name}</Badge>
                      {t.donation_period_id && <Badge tone="info">Otomatis · Donatur</Badge>}
                      {lockedRow && (
                        <Badge tone="neutral">
                          <Lock className="size-3.5" aria-hidden /> Terkunci
                        </Badge>
                      )}
                      {t.proof_path && <Paperclip className="size-4" aria-label="Ada bukti" />}
                    </div>
                  </div>
                  <p className={`text-base font-bold tabular-nums ${t.type === "income" ? "text-emerald-700" : "text-red-700"}`}>
                    {t.type === "income" ? "+" : "−"}
                    {formatRupiah(t.amount)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={count ?? 0}
        basePath="/admin/keuangan"
        baseParams={{ month, type, category, q: q || undefined }}
      />
    </div>
  );
}
