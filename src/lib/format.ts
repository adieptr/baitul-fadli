export const TZ = "Asia/Jakarta";

const rupiahFmt = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return rupiahFmt.format(Number.isFinite(n) ? n : 0);
}

/** Parse "YYYY-MM-DD" sebagai tanggal lokal (tanpa geser zona waktu). */
function parseDateOnly(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function formatDate(date: string | null | undefined, opts?: { weekday?: boolean; short?: boolean }): string {
  if (!date) return "-";
  const d = date.length <= 10 ? parseDateOnly(date) : new Date(date);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: date.length <= 10 ? "UTC" : TZ,
    weekday: opts?.weekday ? "long" : undefined,
    day: "numeric",
    month: opts?.short ? "short" : "long",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  return time.slice(0, 5).replace(":", ".");
}

export const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Ahad"] as const;
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Label periode yang mudah dibaca: "November 2026" atau "Minggu 45 · 2026". */
export function formatPeriodKey(key: string): string {
  const monthly = /^(\d{4})-(\d{2})$/.exec(key);
  if (monthly) return `${MONTHS[Number(monthly[2]) - 1]} ${monthly[1]}`;
  const weekly = /^(\d{4})-W(\d{2})$/.exec(key);
  if (weekly) return `Pekan ke-${Number(weekly[2])} tahun ${weekly[1]}`;
  return key;
}

export function scheduleLabel(s: {
  frequency: "weekly" | "monthly";
  day_of_week: number | null;
  day_of_month: number | null;
}): string {
  if (s.frequency === "weekly") return `Setiap hari ${DAY_NAMES[(s.day_of_week ?? 1) - 1]}`;
  return `Setiap tanggal ${s.day_of_month} tiap bulan`;
}

export type PeriodStatus = "pending" | "awaiting_verification" | "paid" | "unpaid";

export const PERIOD_STATUS: Record<PeriodStatus, { label: string; tone: "warning" | "info" | "success" | "danger" }> = {
  pending: { label: "Menunggu Pembayaran", tone: "warning" },
  awaiting_verification: { label: "Menunggu Verifikasi", tone: "info" },
  paid: { label: "Sudah Dibayar", tone: "success" },
  unpaid: { label: "Belum Dibayar", tone: "danger" },
};

export const SUBSCRIPTION_STATUS: Record<"active" | "paused" | "stopped", { label: string; tone: "success" | "warning" | "neutral" }> = {
  active: { label: "Aktif", tone: "success" },
  paused: { label: "Dijeda", tone: "warning" },
  stopped: { label: "Berhenti", tone: "neutral" },
};

export const FREQUENCY_LABEL = { weekly: "Mingguan", monthly: "Bulanan" } as const;
export const TX_TYPE_LABEL = { income: "Pemasukan", expense: "Pengeluaran" } as const;

/** "Laporan Pekan 20–26 November 2026" (sama dengan SQL week_report_title). */
export function weekReportTitle(start: string, end: string): string {
  const [, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  return ms === me
    ? `Laporan Pekan ${ds}–${de} ${MONTHS[me - 1]} ${ye}`
    : `Laporan Pekan ${ds} ${MONTHS[ms - 1]} – ${de} ${MONTHS[me - 1]} ${ye}`;
}
