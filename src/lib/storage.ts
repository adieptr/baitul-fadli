import "server-only";
import { publicEnv } from "@/lib/env";
import type { createClient } from "@/lib/supabase/server";

export function publicMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/public-media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** URL sementara (10 menit) untuk file privat — akses tetap dicek oleh RLS storage. */
export async function signedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: "transaction-proofs" | "payment-proofs",
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}
