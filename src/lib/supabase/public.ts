import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/** Klien anonim tanpa cookie — untuk halaman publik yang bisa di-cache (ISR). */
export function createPublicClient() {
  return createSupabaseClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
