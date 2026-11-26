import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, type, is_active, is_system, sort_order")
    .order("type")
    .order("sort_order")
    .order("name");
  return data ?? [];
}

/** Rentang periode yang terkunci karena laporannya sudah terbit. */
export async function getLockedRanges() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("financial_reports")
    .select("period_start, period_end, title")
    .eq("status", "published");
  return data ?? [];
}

export function isLocked(date: string, ranges: Array<{ period_start: string; period_end: string }>) {
  return ranges.some((r) => date >= r.period_start && date <= r.period_end);
}
