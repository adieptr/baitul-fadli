import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

/** Perbandingan string anti timing-attack. */
export function safeEqual(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}

/** Kata sandi sementara yang mudah dibacakan (tanpa huruf/angka yang mirip). */
export function readablePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const pick = (n: number) => Array.from(randomBytes(n), (b) => chars[b % chars.length]).join("");
  return `masjid-${pick(4)}-${pick(4)}`;
}
