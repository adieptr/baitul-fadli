import "server-only";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/admin";
import { sha256Hex } from "@/lib/crypto";

/** Identitas klien untuk rate limit — IP di-hash, tidak disimpan mentah. */
export async function clientFingerprint(): Promise<string> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return sha256Hex(`ip:${ip}`).slice(0, 32);
}

/** true = boleh lanjut. Gagal tertutup (fail-closed) bila database error. */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createServiceClient().rpc("hit_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rateLimit", error.message);
    return false;
  }
  return data === true;
}
