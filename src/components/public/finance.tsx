import { ArrowDownCircle, ArrowUpCircle, Landmark, Wallet } from "lucide-react";
import { StatCard } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";
import type { Breakdown, ReportRow } from "@/lib/queries/public";

export function ReportSummary({ report }: { report: Pick<ReportRow, "opening_balance" | "total_income" | "total_expense" | "closing_balance"> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Saldo Awal" value={formatRupiah(report.opening_balance)} icon={<Landmark className="size-4" />} />
      <StatCard label="Pemasukan" value={formatRupiah(report.total_income)} tone="success" icon={<ArrowDownCircle className="size-4" />} />
      <StatCard label="Pengeluaran" value={formatRupiah(report.total_expense)} tone="danger" icon={<ArrowUpCircle className="size-4" />} />
      <StatCard label="Saldo Akhir" value={formatRupiah(report.closing_balance)} tone="brand" icon={<Wallet className="size-4" />} />
    </div>
  );
}

export function BreakdownBars({ breakdown }: { breakdown: Breakdown | null }) {
  const items = breakdown ?? [];
  if (!items.length) return <p className="text-slate-600">Tidak ada transaksi pada periode ini.</p>;
  const groups: Array<["income" | "expense", string, string]> = [
    ["income", "Rincian Pemasukan", "bg-emerald-600"],
    ["expense", "Rincian Pengeluaran", "bg-red-600"],
  ];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {groups.map(([type, title, color]) => {
        const rows = items.filter((b) => b.type === type);
        const max = Math.max(1, ...rows.map((r) => Number(r.total)));
        return (
          <div key={type}>
            <h3 className="mb-3 text-base font-bold">{title}</h3>
            {rows.length === 0 ? (
              <p className="text-slate-600">Tidak ada.</p>
            ) : (
              <ul className="space-y-3">
                {rows.map((r) => (
                  <li key={r.category}>
                    <div className="flex justify-between gap-2 text-base">
                      <span className="font-medium text-slate-800">{r.category}</span>
                      <span className="font-semibold tabular-nums">{formatRupiah(r.total)}</span>
                    </div>
                    <div className="mt-1 h-3 rounded-full bg-slate-100" aria-hidden>
                      <div className={`h-3 rounded-full ${color}`} style={{ width: `${(Number(r.total) / max) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
