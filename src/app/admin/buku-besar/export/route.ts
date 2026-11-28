import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getAdminOrNull } from "@/lib/auth";
import { ACCOUNT_LABEL } from "@/lib/accounts";
import { loadLedger, parseLedgerParams } from "@/lib/ledger";
import { jakartaToday } from "@/lib/schedule";

export const runtime = "nodejs";

const RUPIAH = '"Rp" #,##0';
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** "YYYY-MM-DD" → tanggal Excel sungguhan (siang UTC agar tidak bergeser zona waktu). */
function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export async function GET(req: NextRequest) {
  if (!(await getAdminOrNull())) return new NextResponse("Forbidden", { status: 403 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const { month, account, start, end } = parseLedgerParams(sp, jakartaToday());
  const ledger = await loadLedger(account, start, end);
  const [y, m] = month.split("-").map(Number);
  const accountName = account ? (ACCOUNT_LABEL[account] ?? account) : "Semua Akun";

  const wb = new ExcelJS.Workbook();
  wb.creator = "Masjid Baitul Fadli";
  wb.created = new Date();
  const ws = wb.addWorksheet("Buku Besar", { views: [{ state: "frozen", ySplit: 4 }] });
  ws.columns = [
    { key: "date", width: 14 },
    { key: "desc", width: 46 },
    { key: "cat", width: 24 },
    { key: "acc", width: 14 },
    { key: "in", width: 18 },
    { key: "out", width: 18 },
    { key: "bal", width: 20 },
  ];

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "Buku Besar — Masjid Baitul Fadli";
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `Akun: ${accountName}  ·  Periode: ${BULAN[m - 1]} ${y}`;
  ws.getCell("A2").font = { color: { argb: "FF475569" } };

  const header = ws.getRow(4);
  header.values = ["Tanggal", "Keterangan", "Kategori", "Akun", "Masuk", "Keluar", "Saldo"];
  header.eachCell((c, col) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3F6E" } };
    c.alignment = { vertical: "middle", horizontal: col >= 5 ? "right" : "left" };
  });
  header.height = 22;

  const money = (row: ExcelJS.Row) => {
    for (const col of [5, 6, 7]) row.getCell(col).numFmt = RUPIAH;
  };

  const opening = ws.addRow({ date: toDate(start), desc: "Saldo awal", acc: accountName, bal: ledger.openingBalance });
  opening.font = { italic: true, color: { argb: "FF475569" } };
  opening.getCell(1).numFmt = "dd/mm/yyyy";
  money(opening);

  for (const r of ledger.rows) {
    const row = ws.addRow({
      date: toDate(r.transaction_date),
      desc: r.description,
      cat: r.category_name,
      acc: ACCOUNT_LABEL[r.account_id] ?? r.account_id,
      in: r.income || null,
      out: r.expense || null,
      bal: r.balance,
    });
    row.getCell(1).numFmt = "dd/mm/yyyy";
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    money(row);
  }

  const total = ws.addRow({ desc: "Jumlah bulan ini", in: ledger.totalIncome, out: ledger.totalExpense, bal: ledger.closingBalance });
  total.font = { bold: true };
  total.eachCell((c) => {
    c.border = { top: { style: "thin" } };
  });
  money(total);

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="buku-besar-${month}${account ? `-${account}` : ""}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
