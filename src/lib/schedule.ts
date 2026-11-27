import { TZ } from "@/lib/format";

/** Tanggal hari ini di Asia/Jakarta, format YYYY-MM-DD. */
export function jakartaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function jakartaHour(now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(now));
}

function toUTC(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Jatuh tempo berikutnya (>= hari ini). Konsisten dengan fungsi SQL
 * public.cycle_due_date: mingguan = hari ISO (1=Senin), bulanan = tanggal 1–28.
 */
export function nextDueDate(
  s: { frequency: "weekly" | "monthly"; day_of_week: number | null; day_of_month: number | null; started_at?: string },
  today: string = jakartaToday(),
): string {
  const base = s.started_at && s.started_at > today ? s.started_at : today;
  const t = toUTC(base);
  if (s.frequency === "weekly") {
    const isoDow = ((t.getUTCDay() + 6) % 7) + 1;
    const diff = ((s.day_of_week ?? 1) - isoDow + 7) % 7;
    t.setUTCDate(t.getUTCDate() + diff);
    return fmt(t);
  }
  const dom = s.day_of_month ?? 1;
  const candidate = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), dom));
  if (candidate < t) candidate.setUTCMonth(candidate.getUTCMonth() + 1);
  return fmt(candidate);
}

/** Pekan laporan terakhir yang sudah selesai: Jumat s/d Kamis (sama dengan SQL last_completed_week). */
export function lastCompletedWeek(today: string = jakartaToday()): { start: string; end: string } {
  const t = toUTC(today);
  t.setUTCDate(t.getUTCDate() - 1); // hari ini belum selesai
  const isoDow = ((t.getUTCDay() + 6) % 7) + 1;
  t.setUTCDate(t.getUTCDate() - ((isoDow - 4 + 7) % 7)); // mundur ke Kamis
  const end = fmt(t);
  t.setUTCDate(t.getUTCDate() - 6);
  return { start: fmt(t), end };
}
