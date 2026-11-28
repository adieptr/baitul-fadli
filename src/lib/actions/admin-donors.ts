"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminOrNull } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import { notifyDonorPaymentVerified, notifyDonorVoluntaryVerified, runDailyReminders, sendManualReminder } from "@/lib/notifications";
import { getTelegramWebhookInfo, setTelegramWebhook } from "@/lib/telegram";
import {
  dbErrorMessage,
  failure,
  formObject,
  success,
  validationFailure,
  type ActionState,
} from "@/lib/action-state";
import { periodStatusSchema, voluntaryStatusSchema } from "@/lib/validation";
import { PERIOD_STATUS } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase/admin";
import { readablePassword } from "@/lib/crypto";
import { sendTelegramMessage } from "@/lib/telegram";
import { purgeAccount } from "@/lib/account-deletion";
import { redirect } from "next/navigation";

const FORBIDDEN = failure("Anda tidak memiliki akses admin.");
const idSchema = z.uuid();

export async function setPeriodStatusAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const parsed = periodStatusSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_period_status", {
    p_period_id: parsed.data.period_id,
    p_status: parsed.data.status,
    p_admin_note: parsed.data.admin_note ?? undefined,
    p_record_income: parsed.data.record_income,
    p_amount: parsed.data.amount ?? undefined,
    p_account: parsed.data.account ?? undefined,
  });
  if (error) return failure(dbErrorMessage(error));
  if (parsed.data.status === "paid") after(() => notifyDonorPaymentVerified(parsed.data.period_id));
  revalidatePath("/admin", "layout");
  revalidatePath("/akun", "layout");
  return success(`Status diubah menjadi "${PERIOD_STATUS[parsed.data.status].label}".`);
}

export async function sendReminderAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getAdminOrNull();
  if (!admin) return FORBIDDEN;
  const id = idSchema.safeParse(formData.get("period_id"));
  if (!id.success) return failure("ID tidak valid.");
  const r = await sendManualReminder(id.data, admin.id);
  revalidatePath("/admin/pembayaran");
  return r.ok ? success(r.message) : failure(r.message);
}

export async function adminSetSubscriptionStatusAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const id = idSchema.safeParse(formData.get("id"));
  const status = z.enum(["active", "paused", "stopped"]).safeParse(formData.get("status"));
  if (!id.success || !status.success) return failure("Data tidak valid.");
  const supabase = await createClient();
  const { error } = await supabase.from("donor_subscriptions").update({ status: status.data }).eq("id", id.data);
  if (error) return failure(dbErrorMessage(error));
  revalidatePath("/admin/donatur", "layout");
  return success("Status donatur diperbarui.");
}

export async function setUserRoleAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getAdminOrNull();
  if (!admin) return FORBIDDEN;
  const id = idSchema.safeParse(formData.get("user_id"));
  const role = z.enum(["admin", "user"]).safeParse(formData.get("role"));
  if (!id.success || !role.success) return failure("Data tidak valid.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", { p_user_id: id.data, p_role: role.data });
  if (error) return failure(dbErrorMessage(error));
  revalidatePath("/admin/pengguna");
  return success(role.data === "admin" ? "Pengguna dijadikan admin." : "Hak admin dicabut.");
}

export async function generatePeriodsAction(): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_donation_periods", {});
  if (error) return failure(dbErrorMessage(error));
  revalidatePath("/admin", "layout");
  return success(data ? `${data} tagihan baru dibuat.` : "Tidak ada tagihan baru. Semua tagihan sudah terbentuk.");
}

export async function runRemindersNowAction(): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  if (!serverEnv.telegramConfigured()) return failure("Bot Telegram belum dikonfigurasi (TELEGRAM_BOT_TOKEN).");
  try {
    const r = await runDailyReminders({ force: true });
    revalidatePath("/admin", "layout");
    return success(
      `Selesai. Tagihan baru: ${r.generated}. Pengingat terkirim: ${r.sent}, gagal: ${r.failed}, dilewati: ${r.skipped}.`,
    );
  } catch (e) {
    console.error(e);
    return failure("Gagal menjalankan pengingat. Periksa konfigurasi server.");
  }
}

export async function setupTelegramWebhookAction(): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  if (!serverEnv.telegramConfigured()) return failure("TELEGRAM_BOT_TOKEN dan TELEGRAM_WEBHOOK_SECRET belum diatur.");
  if (!publicEnv.siteUrl.startsWith("https://"))
    return failure("Webhook Telegram membutuhkan domain HTTPS (NEXT_PUBLIC_SITE_URL). Jalankan setelah deploy ke Vercel.");
  const r = await setTelegramWebhook(`${publicEnv.siteUrl}/api/telegram/webhook`);
  if (!r.ok) return failure(`Gagal mengaktifkan webhook: ${r.description}`);
  const info = await getTelegramWebhookInfo();
  return success(`Webhook aktif di ${info.url}.`);
}


/**
 * Admin membuat kata sandi sementara untuk pengguna yang lupa sandi dan
 * belum menghubungkan Telegram. Kata sandi hanya ditampilkan sekali.
 */
export async function adminResetPasswordAction(userId: string): Promise<ActionState & { tempPassword?: string }> {
  const admin = await getAdminOrNull();
  if (!admin) return FORBIDDEN;
  const id = idSchema.safeParse(userId);
  if (!id.success) return failure("ID tidak valid.");
  if (id.data === admin.id) return failure("Gunakan menu Profil untuk mengganti kata sandi Anda sendiri.");
  const service = createServiceClient();
  const tempPassword = readablePassword();
  const { error } = await service.auth.admin.updateUserById(id.data, { password: tempPassword });
  if (error) return failure("Gagal mereset kata sandi.");
  await service.from("audit_logs").insert({
    actor_id: admin.id,
    action: "password_reset",
    entity: "profiles",
    entity_id: id.data,
    details: { channel: "admin" },
  });
  const { data: link } = await service.from("telegram_links").select("chat_id").eq("user_id", id.data).maybeSingle();
  if (link) {
    await sendTelegramMessage(link.chat_id, "🔐 Pengurus masjid telah membuat kata sandi sementara untuk akun Anda. Segera ganti di menu Profil setelah masuk.");
  }
  return { ...success("Kata sandi sementara dibuat."), tempPassword };
}

/**
 * Admin menghapus akun donatur/pengguna (mis. atas permintaan donatur yang tidak
 * bisa masuk, akun ganda, atau akun uji coba). Akun admin harus dicabut haknya dulu.
 */
export async function adminDeleteAccountAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await getAdminOrNull();
  if (!admin) return FORBIDDEN;
  const id = idSchema.safeParse(formData.get("user_id"));
  if (!id.success) return failure("ID tidak valid.");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (reason.length < 3) return failure("Alasan wajib diisi.", { reason: ["Tuliskan alasan penghapusan."] });
  if (id.data === admin.id) return failure("Anda tidak dapat menghapus akun Anda sendiri dari sini.");

  const service = createServiceClient();
  const { data: target } = await service.from("profiles").select("role").eq("id", id.data).maybeSingle();
  if (!target) return failure("Akun tidak ditemukan atau sudah dihapus.");
  if (target.role === "admin") return failure("Akun ini masih admin. Cabut hak adminnya terlebih dahulu.");

  const { data: link } = await service.from("telegram_links").select("chat_id").eq("user_id", id.data).maybeSingle();
  const { ok } = await purgeAccount(id.data, { actorId: admin.id, by: "admin", reason });
  if (!ok) return failure("Gagal menghapus akun. Silakan coba lagi.");
  if (link) {
    after(() =>
      sendTelegramMessage(link.chat_id, "ℹ️ Akun Anda di aplikasi Masjid Baitul Fadli telah dihapus oleh pengurus masjid. Bila ini keliru, silakan hubungi pengurus atau daftar kembali.").catch(() => {}),
    );
  }
  revalidatePath("/admin/donatur", "layout");
  revalidatePath("/admin/pengguna");
  if (formData.get("from") === "donatur") redirect("/admin/donatur?deleted=1");
  return success("Akun berhasil dihapus.");
}

export async function setVoluntaryStatusAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const parsed = voluntaryStatusSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_voluntary_status", {
    p_id: parsed.data.id,
    p_status: parsed.data.status,
    p_note: parsed.data.admin_note ?? undefined,
    p_amount: parsed.data.amount ?? undefined,
    p_account: parsed.data.account ?? undefined,
    p_category: parsed.data.category_id ?? undefined,
  });
  if (error) return failure(dbErrorMessage(error));
  if (parsed.data.status === "verified") after(() => notifyDonorVoluntaryVerified(parsed.data.id));
  revalidatePath("/admin", "layout");
  revalidatePath("/akun", "layout");
  const label = { awaiting_verification: "dikembalikan ke Menunggu Verifikasi", verified: "diverifikasi dan dicatat sebagai pemasukan", rejected: "ditolak" }[parsed.data.status];
  return success(`Donasi ${label}.`);
}
