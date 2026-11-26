"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Klien browser (dipakai untuk upload file langsung ke Supabase Storage, RLS berlaku). */
export function getBrowserClient() {
  client ??= createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseKey);
  return client;
}
