"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { safeNextPath } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { clientFingerprint, rateLimit } from "@/lib/rate-limit";
import { escapeHtml, sendTelegramMessage } from "@/lib/telegram";
import { serverEnv } from "@/lib/server-env";
import { failure, formObject, success, validationFailure, type ActionState } from "@/lib/action-state";
import { identifierSchema, loginSchema, newPasswordSchema, registerSchema } from "@/lib/validation";
import { syntheticEmailForPhone } from "@/lib/synthetic-email";

const RESET_TTL_MINUTES = 30;

/**
 * Pendaftaran TANPA email konfirmasi: akun dibuat lewat Admin API Supabase
 * (email_confirm = true) sehingga langsung aktif dan Supabase tidak mengirim
 * email apa pun. Perlindungan penyalahgunaan: honeypot + rate limit per IP.
 */
export async function signUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return failure("Pendaftaran gagal.");
    return validationFailure(parsed.error);
  }
  const { password, full_name, phone } = parsed.data;
  // Tanpa email: akun memakai email internal dari nomor HP (tidak pernah dikirimi pesan).
  const email = syntheticEmailForPhone(phone);

  const fp = await clientFingerprint();
  if (!(await rateLimit(`signup:${fp}`, 5, 3600))) {
    return failure("Terlalu banyak pendaftaran dari perangkat/jaringan ini. Silakan coba lagi 1 jam lagi.");
  }

  const admin = createServiceClient();
  const { data: phoneOwner } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle();
  if (phoneOwner) {
    return failure("Nomor HP sudah terdaftar. Silakan masuk, atau gunakan menu Lupa Kata Sandi.", {
      phone: ["Nomor HP sudah terdaftar."],
    });
  }

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone },
  });
  if (error) {
    if (error.code === "email_exists" || error.status === 422) {
      return failure("Nomor HP sudah terdaftar. Silakan masuk.", { phone: ["Nomor HP sudah terdaftar."] });
    }
    if (error.code === "weak_password") return failure("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
    console.error("signUp", error.code, error.message);
    return failure("Pendaftaran gagal. Silakan coba lagi.");
  }

  const supabase = await createClient();
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) return success("Akun berhasil dibuat. Silakan masuk.");
  redirect("/akun/donasi?welcome=1");
}

/** Cari email akun dari nomor HP (dipakai untuk login & reset). */
async function emailForIdentifier(id: { kind: "email" | "phone"; value: string }) {
  if (id.kind === "email") return id.value;
  const { data } = await createServiceClient().from("profiles").select("email").eq("phone", id.value).maybeSingle();
  return data?.email ?? null;
}

export async function signInAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  const fp = await clientFingerprint();
  if (!(await rateLimit(`login:${fp}`, 20, 900))) {
    return failure("Terlalu banyak percobaan masuk. Silakan tunggu 15 menit.");
  }

  const email = await emailForIdentifier(parsed.data.identifier);
  const invalid = failure("Email/nomor HP atau kata sandi salah.");
  if (!email) return invalid;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (error) {
    if (error.status === 429) return failure("Terlalu banyak percobaan. Silakan coba lagi beberapa menit lagi.");
    return invalid;
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  const fallback = profile?.role === "admin" ? "/admin" : "/akun";
  const next = safeNextPath(String(formData.get("next") ?? ""), fallback);
  redirect(next.startsWith("/admin") && profile?.role !== "admin" ? "/akun" : next);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Lupa kata sandi → tautan reset dikirim ke Telegram yang sudah tertaut.
 * Pesan selalu sama agar keberadaan akun tidak bisa ditebak.
 */
export async function forgotPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = identifierSchema.safeParse(formData.get("identifier"));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Isian tidak valid.";
    return failure(msg, { identifier: [msg] });
  }
  const generic = success(
    "Jika akun terdaftar dan sudah terhubung Telegram, tautan untuk membuat kata sandi baru telah dikirim ke Telegram Anda (berlaku 30 menit). Belum menghubungkan Telegram? Silakan hubungi pengurus masjid.",
  );

  const fp = await clientFingerprint();
  const idKey = sha256Hex(`id:${parsed.data.value}`).slice(0, 32);
  if (!(await rateLimit(`reset-ip:${fp}`, 10, 3600)) || !(await rateLimit(`reset-id:${idKey}`, 3, 3600))) {
    return failure("Terlalu banyak permintaan. Silakan coba lagi 1 jam lagi.");
  }
  if (!serverEnv.telegramConfigured()) return generic;

  const admin = createServiceClient();
  const col = parsed.data.kind === "email" ? "email" : "phone";
  const { data: profile } = await admin.from("profiles").select("id, full_name").eq(col, parsed.data.value).maybeSingle();
  if (!profile) return generic;
  const { data: link } = await admin.from("telegram_links").select("chat_id").eq("user_id", profile.id).maybeSingle();
  if (!link) return generic;

  const token = randomToken(32);
  const { error } = await admin.from("password_reset_tokens").insert({
    token_hash: sha256Hex(token),
    user_id: profile.id,
    channel: "telegram",
    expires_at: new Date(Date.now() + RESET_TTL_MINUTES * 60_000).toISOString(),
  });
  if (error) {
    console.error("forgotPassword", error.message);
    return generic;
  }
  const url = `${publicEnv.siteUrl}/reset-password?token=${token}`;
  await sendTelegramMessage(
    link.chat_id,
    [
      `Assalamu'alaikum, <b>${escapeHtml(profile.full_name || "Bapak/Ibu")}</b>.`,
      "",
      "Ada permintaan membuat <b>kata sandi baru</b> untuk akun Anda di website Masjid Baitul Fadli.",
      `Buka tautan berikut (berlaku ${RESET_TTL_MINUTES} menit):`,
      url,
      "",
      "Jika Anda tidak merasa meminta, abaikan pesan ini. Kata sandi Anda tidak berubah.",
    ].join("\n"),
    { buttonText: "Buat Kata Sandi Baru", buttonUrl: url },
  );
  return generic;
}

/** Atur kata sandi baru memakai token dari Telegram (tanpa perlu login). */
export async function resetPasswordWithTokenAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return failure("Tautan tidak valid. Silakan minta tautan baru.");
  const parsed = newPasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  const admin = createServiceClient();
  const { data: userId, error } = await admin.rpc("consume_password_reset_token", { p_token_hash: sha256Hex(token) });
  if (error || !userId) return failure("Tautan sudah tidak berlaku atau sudah dipakai. Silakan minta tautan baru.");

  const { error: upd } = await admin.auth.admin.updateUserById(userId, { password: parsed.data.password });
  if (upd) {
    console.error("resetPassword", upd.message);
    return failure("Gagal menyimpan kata sandi baru. Silakan minta tautan baru.");
  }
  const { data: link } = await admin.from("telegram_links").select("chat_id").eq("user_id", userId).maybeSingle();
  if (link) {
    await sendTelegramMessage(link.chat_id, "🔐 Kata sandi akun Anda baru saja diganti. Jika bukan Anda, segera hubungi pengurus masjid.");
  }
  redirect("/masuk?reset=1");
}

/** Ganti kata sandi untuk user yang sedang login (menu Profil). */
export async function updatePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return failure("Sesi tidak valid. Silakan masuk kembali.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return failure("Kata sandi baru tidak boleh sama dengan yang lama.");
    return failure("Gagal mengubah kata sandi. Silakan coba lagi.");
  }
  return success("Kata sandi berhasil diubah.");
}
