import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: "admin" | "user";
};

/** Membaca user yang sedang login (diverifikasi ke Supabase Auth). Di-cache per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, email")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email ?? String(claimsData.claims.email ?? ""),
    fullName: profile.full_name,
    phone: profile.phone,
    role: profile.role,
  };
});

export async function requireUser(next = "/akun"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/masuk?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?next=/admin");
  if (user.role !== "admin") redirect("/akun");
  return user;
}

/** Untuk Server Action: kembalikan null bila bukan admin (tanpa redirect). */
export async function getAdminOrNull(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

/** Validasi parameter `next` agar tidak bisa dipakai open redirect. */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
