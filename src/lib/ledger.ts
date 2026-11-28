import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ACCOUNTS } from "@/lib/accounts";

export type LedgerRow = {
  id: string;
  transaction_date: string;
  account_id: string;
  type: "income" | "expense";
  category_name: string;
  description: string;
  income: number;
  expense: number;
  balance: number;
};

export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
}

export function parseLedgerParams(sp: { month?: string; account?: string }, today: string) {
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);
  const account = ACCOUNTS.find((a) => a.id === sp.account)?.id ?? null;
  return { month, account, ...monthRange(month) };
}

export async function loadLedger(account: string | null, start: string, end: string) {
  const supabase = await createClient();
  const [{ data: opening }, { data: rows, error }] = await Promise.all([
    supabase.rpc("ledger_opening_balance", { p_account: account ?? undefined, p_start: start }),
    supabase.rpc("get_ledger", { p_account: account ?? undefined, p_start: start, p_end: end }),
  ]);
  if (error) throw new Error(error.message);
  const list: LedgerRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    transaction_date: r.transaction_date,
    account_id: r.account_id,
    type: r.type,
    category_name: r.category_name,
    description: r.description,
    income: Number(r.income),
    expense: Number(r.expense),
    balance: Number(r.balance),
  }));
  const openingBalance = Number(opening ?? 0);
  const totalIncome = list.reduce((s, r) => s + r.income, 0);
  const totalExpense = list.reduce((s, r) => s + r.expense, 0);
  return { openingBalance, rows: list, totalIncome, totalExpense, closingBalance: openingBalance + totalIncome - totalExpense };
}
