/** Sumber dana masjid. ID sama dengan tabel public.fund_accounts. */
export const ACCOUNTS = [
  { id: "cash", label: "Kas Tunai", short: "Tunai" },
  { id: "bsi", label: "Bank BSI", short: "BSI" },
] as const;

export type AccountId = (typeof ACCOUNTS)[number]["id"];
export const ACCOUNT_IDS = ACCOUNTS.map((a) => a.id) as [AccountId, ...AccountId[]];
export const ACCOUNT_LABEL: Record<string, string> = Object.fromEntries(ACCOUNTS.map((a) => [a.id, a.label]));
export const ACCOUNT_SHORT: Record<string, string> = Object.fromEntries(ACCOUNTS.map((a) => [a.id, a.short]));
