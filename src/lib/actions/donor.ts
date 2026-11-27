"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { randomToken, sha256Hex } from "@/lib/crypto";
import { notifyAdminsPaymentConfirmed } from "@/lib/notifications";
import {
  dbErrorMessage,
  failure,
  formObject,
  success,
  validationFailure,
  type ActionState,
} from "@/lib/action-state";
import { confirmPaymentSchema, profileSchema, subscriptionSchema } from "@/lib/validation";

const NOT_LOGGED_IN = failure("Sesi Anda telah berakhir. Silakan masuk kembali.");

export async function updateProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED_IN;
  const parsed = profileSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error?.code === "23505") return failure("Nomor HP sudah dipakai akun lain.", { phone: ["Nomor HP sudah dipakai akun lain."] });
  if (error) return failure(dbErrorMessage(error));
  revalidatePath("/akun", "layout");
  return success("Profil berhasil disimpan.");
}

export async function saveSubscriptionAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED_IN;
  const parsed = subscriptionSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();

  const { data: existing } = await supabase.from("donor_subscriptions").select("id").eq("user_id", user.id).maybeSingle();
  const { error } = existing
    ? await supabase
        .from("donor_subscriptions")
        .update({ ...parsed.data, status: "active" })
        .eq("id", existing.id)
    : await supabase.from("donor_subscriptions").insert({ ...parsed.data, user_id: user.id });
  if (error) return failure(dbErrorMessage(error));

  revalidatePath("/akun", "layout");
  return success(
    existing
      ? "Pengaturan donasi berhasil diperbarui."
      : "Alhamdulillah, Anda telah terdaftar sebagai donatur tetap. Jazakumullahu khairan!",
  );
}

export async function setSubscriptionStatusAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED_IN;
  const status = String(formData.get("status"));
  if (!["active", "paused", "stopped"].includes(status)) return failure("Status tidak valid.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("donor_subscriptions")
    .update({ status: status as "active" | "paused" | "stopped" })
    .eq("user_id", user.id);
  if (error) return failure(dbErrorMessage(error));
  revalidatePath("/akun", "layout");
  const label = { active: "diaktifkan kembali", paused: "dijeda", stopped: "dihentikan" }[status];
  return success(`Donasi rutin berhasil ${label}.`);
}

export async function confirmPaymentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED_IN;
  const parsed = confirmPaymentSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_donation_payment", {
    p_period_id: parsed.data.period_id,
    p_note: parsed.data.note ?? undefined,
    p_proof_path: parsed.data.proof_path ?? undefined,
  });
  if (error) return failure(dbErrorMessage(error));
  after(() => notifyAdminsPaymentConfirmed(parsed.data.period_id));
  revalidatePath("/akun", "layout");
  // Kartu tagihan akan hilang setelah status berubah, jadi tampilkan pesan di halaman tujuan.
  redirect("/akun?konfirmasi=1");
}

export async function createTelegramLinkAction(): Promise<ActionState & { url?: string }> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED_IN;
  if (!publicEnv.telegramBotUsername) return failure("Bot Telegram belum dikonfigurasi oleh pengurus.");
  const token = randomToken(24);
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_telegram_link_token", { p_token_hash: sha256Hex(token) });
  if (error) return failure(dbErrorMessage(error));
  return { ...success("Tautan dibuat."), url: `https://t.me/${publicEnv.telegramBotUsername}?start=${token}` };
}

export async function unlinkTelegramAction(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED_IN;
  const supabase = await createClient();
  const { error } = await supabase.from("telegram_links").delete().eq("user_id", user.id);
  if (error) return failure(dbErrorMessage(error));
  revalidatePath("/akun", "layout");
  return success("Tautan Telegram telah diputuskan.");
}

/**
 * Hapus akun (hak pengguna atas data pribadinya — UU PDP).
 * Dihapus: profil, nomor HP, pengaturan donasi, riwayat tagihan, tautan
 * Telegram, foto bukti transfer. Tetap ada (anonim): transaksi pemasukan
 * masjid, karena bagian dari pembukuan yang sudah dilaporkan ke jamaah.
 */
export async function deleteAccountAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return NOT_LOGGED_IN;
  if (user.role === "admin") {
    return failure("Akun pengurus tidak dapat dihapus sendiri. Minta admin lain mencabut hak admin Anda terlebih dahulu.");
  }
  const password = String(formData.get("password") ?? "");
  if (!password) return failure("Masukkan kata sandi untuk konfirmasi.", { password: ["Wajib diisi."] });
  if (!(await rateLimit(`delete-account:${user.id}`, 5, 3600))) {
    return failure("Terlalu banyak percobaan. Silakan coba lagi 1 jam lagi.");
  }

  // Verifikasi kata sandi dengan klien terpisah (tidak mengubah sesi aktif)
  const verifier = createPublicClient();
  const { error: authError } = await verifier.auth.signInWithPassword({ email: user.email, password });
  if (authError) return failure("Kata sandi salah.", { password: ["Kata sandi salah."] });
  await verifier.auth.signOut().catch(() => {});

  const admin = createServiceClient();
  // Hapus foto bukti transfer milik pengguna
  const { data: files } = await admin.storage.from("payment-proofs").list(user.id, { limit: 1000 });
  if (files?.length) {
    await admin.storage.from("payment-proofs").remove(files.map((f) => `${user.id}/${f.name}`));
  }
  // Jejak audit tanpa data pribadi
  await admin.from("audit_logs").insert({
    actor_id: null,
    action: "account_deleted",
    entity: "profiles",
    entity_id: user.id,
    details: { by: "self" },
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("deleteAccount", error.message);
    return failure("Gagal menghapus akun. Silakan coba lagi atau hubungi pengurus masjid.");
  }
  const supabase = await createClient();
  await supabase.auth.signOut().catch(() => {});
  redirect("/masuk?akun-dihapus=1");
}
