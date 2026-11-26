import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import type { Database } from "@/lib/database.types";

/**
 * Klien service role — MELEWATI RLS. Hanya dipakai di server untuk proses
 * sistem (webhook Telegram, cron reminder, notifikasi). Jangan pernah
 * diimpor dari komponen klien.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(publicEnv.supabaseUrl, serverEnv.supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
