/**
 * Pendaftaran tanpa email: Supabase Auth tetap membutuhkan email, jadi akun
 * diberi email internal dari nomor HP. Email ini TIDAK pernah dipakai untuk
 * mengirim pesan (konfirmasi email nonaktif, reset sandi via Telegram/admin)
 * dan tidak ditampilkan ke pengguna. Domain resmi masjid dipakai karena punya
 * MX record yang valid sehingga lolos validasi email Supabase.
 */
export const SYNTHETIC_EMAIL_DOMAIN = "masjidbaitulfadli.or.id";

export function syntheticEmailForPhone(phone: string): string {
  return `donatur.${phone}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function isSyntheticEmail(email: string | null | undefined): boolean {
  return /^donatur\.\d+@masjidbaitulfadli\.or\.id$/i.test(email ?? "");
}

/** Email yang layak ditampilkan (null untuk email internal). */
export function displayEmail(email: string | null | undefined): string | null {
  return email && !isSyntheticEmail(email) ? email : null;
}
