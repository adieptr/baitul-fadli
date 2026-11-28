import { NextResponse, type NextRequest } from "next/server";
import { getAdminOrNull } from "@/lib/auth";
import { ACCOUNT_LABEL } from "@/lib/accounts";
import { loadLedger, parseLedgerParams } from "@/lib/ledger";
import { jakartaToday } from "@/lib/schedule";

// Sel CSV: lindungi dari injeksi rumus spreadsheet (=, +, -, @) dan kutip bila perlu.
function cell(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  if (!(await getAdminOrNull())) return new NextResponse("Forbidden", { status: 403 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const { month, account, start, end } = parseLedgerParams(sp, jakartaToday());
  const ledger = await loadLedger(account, start, end);
  const lines = [
    ["Tanggal", "Keterangan", "Kategori", "Akun", "Masuk", "Keluar", "Saldo"].join(","),
    ["", "Saldo awal", "", account ? ACCOUNT_LABEL[account] : "Semua Akun", "", "", ledger.openingBalance].map(cell).join(","),
    ...ledger.rows.map((r) =>
      [r.transaction_date, r.description, r.category_name, ACCOUNT_LABEL[r.account_id] ?? r.account_id, r.income || "", r.expense || "", r.balance]
        .map(cell)
        .join(","),
    ),
  ];
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="buku-besar-${month}${account ? `-${account}` : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
