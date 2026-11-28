import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACCOUNT_LABEL } from "@/lib/accounts";
import { formatRupiah } from "@/lib/format";

export type AccountSummary = { account: string; name: string; opening_balance: number; income: number; expense: number; closing_balance: number };
export type MatrixRow = { account: string; category: string; type: "income" | "expense"; total: number; count: number };

/** Khusus admin: sumber dana (Kas Tunai / BSI) dan jenis pemasukan/pengeluaran. */
export function AccountBreakdown({ byAccount, matrix }: { byAccount: AccountSummary[]; matrix: MatrixRow[] }) {
  if (!byAccount.length) return null;
  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Rincian per Sumber Dana</h2>
        <p className="text-sm text-slate-600">Hanya terlihat oleh admin. Laporan publik hanya menampilkan ringkasan 4 angka.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-base">
          <thead className="text-sm text-slate-600">
            <tr>
              <th className="py-2 pr-3 font-semibold">Akun</th>
              <th className="px-3 py-2 text-right font-semibold">Saldo Awal</th>
              <th className="px-3 py-2 text-right font-semibold">Masuk</th>
              <th className="px-3 py-2 text-right font-semibold">Keluar</th>
              <th className="py-2 pl-3 text-right font-semibold">Saldo Akhir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {byAccount.map((a) => (
              <tr key={a.account}>
                <td className="py-3 pr-3 font-semibold">{a.name}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatRupiah(a.opening_balance)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{formatRupiah(a.income)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-red-700">{formatRupiah(a.expense)}</td>
                <td className="py-3 pl-3 text-right font-bold tabular-nums">{formatRupiah(a.closing_balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {(["income", "expense"] as const).map((type) => {
          const rows = matrix.filter((m) => m.type === type);
          return (
            <div key={type}>
              <h3 className="mb-2 text-base font-bold">{type === "income" ? "Pemasukan: jenis & sumber" : "Pengeluaran: jenis & sumber"}</h3>
              {!rows.length ? (
                <p className="text-slate-600">Tidak ada.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {rows.map((m) => (
                    <li key={`${m.account}-${m.category}`} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="font-medium">{m.category}</span>{" "}
                        <Badge tone={m.account === "bsi" ? "info" : "neutral"}>{ACCOUNT_LABEL[m.account] ?? m.account}</Badge>
                        <span className="ml-1 text-sm text-slate-500">{m.count}×</span>
                      </span>
                      <span className="font-semibold tabular-nums">{formatRupiah(m.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
