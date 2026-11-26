import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { jakartaToday } from "@/lib/schedule";
import type { Database } from "@/lib/database.types";

export type SiteSettings = Database["public"]["Tables"]["site_settings"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type ReportRow = Database["public"]["Tables"]["financial_reports"]["Row"];
export type Breakdown = Array<{ category: string; type: "income" | "expense"; total: number; count: number }>;

const FALLBACK_SETTINGS: SiteSettings = {
  id: 1,
  mosque_name: "Masjid Baitul Fadli",
  tagline: "",
  profile_content: "",
  hero_image_path: null,
  address: "",
  phone: "",
  whatsapp: "",
  email: "",
  maps_url: "",
  payment_info: "",
  service_hours: "",
  updated_at: new Date(0).toISOString(),
};

// Data publik dibaca dengan klien anonim (RLS: hanya data terbit).
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const { data, error } = await createPublicClient().from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error) console.error("getSiteSettings", error.message);
  return data ?? FALLBACK_SETTINGS;
});

export const getPublishedReports = cache(async (): Promise<ReportRow[]> => {
  const { data, error } = await createPublicClient()
    .from("financial_reports")
    .select("*")
    .eq("status", "published")
    .order("period_end", { ascending: false })
    .limit(120);
  if (error) console.error("getPublishedReports", error.message);
  return data ?? [];
});

export async function getPublishedReport(id: string): Promise<ReportRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createPublicClient()
    .from("financial_reports")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  return data;
}

export async function getReportTransactions(id: string) {
  const { data, error } = await createPublicClient().rpc("get_public_report_transactions", { p_report_id: id });
  if (error) console.error("getReportTransactions", error.message);
  return data ?? [];
}

export const getUpcomingEvents = cache(async (limit = 6): Promise<EventRow[]> => {
  const { data, error } = await createPublicClient()
    .from("events")
    .select("*")
    .eq("is_published", true)
    .gte("event_date", jakartaToday())
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) console.error("getUpcomingEvents", error.message);
  return data ?? [];
});

export const getPastEvents = cache(async (limit = 12): Promise<EventRow[]> => {
  const { data } = await createPublicClient()
    .from("events")
    .select("*")
    .eq("is_published", true)
    .lt("event_date", jakartaToday())
    .order("event_date", { ascending: false })
    .limit(limit);
  return data ?? [];
});

export async function getPublishedEvent(id: string): Promise<EventRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createPublicClient().from("events").select("*").eq("id", id).eq("is_published", true).maybeSingle();
  return data;
}

export const getActivePrograms = cache(async () => {
  const { data } = await createPublicClient()
    .from("donation_programs")
    .select("id, title, description, target_amount")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");
  return data ?? [];
});
