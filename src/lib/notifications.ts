import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { escapeHtml, sendTelegramMessage } from "@/lib/telegram";
import { formatDate, formatPeriodKey, formatRupiah } from "@/lib/format";
import { jakartaHour } from "@/lib/schedule";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";

type Kind = "due" | "followup" | "manual";

export function reminderMessage(p: {
  fullName: string;
  amount: number | string;
  periodKey: string;
  dueDate: string;
  mosqueName: string;
  paymentInfo: string;
  kind: Kind;
}): string {
  const greeting = p.fullName ? `Bapak/Ibu <b>${escapeHtml(p.fullName)}</b>` : "Bapak/Ibu";
  const intro =
    p.kind === "followup"
      ? `Ini <b>pengingat kedua</b> donasi rutin ${escapeHtml(p.mosqueName)}. Mohon abaikan bila sudah membayar.`
      : `Ini pengingat donasi rutin ${escapeHtml(p.mosqueName)}.`;
  return [
    `Assalamu'alaikum, ${greeting} 🙏`,
    "",
    intro,
    "",
    `• Periode: <b>${escapeHtml(formatPeriodKey(p.periodKey))}</b>`,
    `• Nominal: <b>${escapeHtml(formatRupiah(p.amount))}</b>`,
    `• Jatuh tempo: ${escapeHtml(formatDate(p.dueDate, { weekday: true }))}`,
    "",
    p.paymentInfo ? `<b>Cara pembayaran:</b>\n${escapeHtml(p.paymentInfo)}\n` : null,
    `Setelah transfer, mohon tekan tombol <b>"Saya Sudah Bayar"</b> di halaman akun Anda:`,
    `${publicEnv.siteUrl}/akun`,
    "",
    "Jazakumullahu khairan. Semoga Allah membalas dengan keberkahan.",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

async function getSiteInfo(supabase: ReturnType<typeof createServiceClient>) {
  const { data } = await supabase.from("site_settings").select("mosque_name, payment_info").eq("id", 1).maybeSingle();
  return { mosqueName: data?.mosque_name ?? "Masjid Baitul Fadli", paymentInfo: data?.payment_info ?? "" };
}

async function handleBlocked(supabase: ReturnType<typeof createServiceClient>, userId: string) {
  // User memblokir bot: hapus tautan agar tidak dicoba terus.
  await supabase.from("telegram_links").delete().eq("user_id", userId);
}

export type ReminderRunResult = {
  generated: number;
  candidates: number;
  sent: number;
  failed: number;
  skipped: number;
  sendingWindow: boolean;
  weeklyDraftId: string | null;
};

/**
 * Proses harian: (1) buat tagihan periode yang jatuh tempo, (2) kirim reminder
 * Telegram. Aman dipanggil berulang (idempoten lewat claim_reminder).
 */
export async function runDailyReminders(opts: { force?: boolean } = {}): Promise<ReminderRunResult> {
  const supabase = createServiceClient();
  const result: ReminderRunResult = {
    generated: 0,
    candidates: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    sendingWindow: true,
    weeklyDraftId: null,
  };

  const { data: generated, error: genError } = await supabase.rpc("generate_donation_periods", {});
  if (genError) throw new Error(`generate_donation_periods: ${genError.message}`);
  result.generated = generated ?? 0;

  // Draf laporan pekan lalu (Jumat–Kamis) dibuat otomatis; admin tinggal memeriksa & mempublikasikan.
  const { data: draftId, error: draftError } = await supabase.rpc("create_weekly_report_draft", {});
  if (draftError) console.error("create_weekly_report_draft", draftError.message);
  result.weeklyDraftId = draftId ?? null;
  if (draftId) await notifyAdminsWeeklyDraft(supabase, draftId);

  // Jangan kirim pesan di luar jam wajar (06.00–21.00 WIB).
  const hour = jakartaHour();
  if (!opts.force && (hour < 6 || hour >= 21)) {
    result.sendingWindow = false;
    return result;
  }
  if (!serverEnv.telegramConfigured()) {
    result.sendingWindow = false;
    return result;
  }

  const { data: candidates, error } = await supabase.rpc("get_reminder_candidates", {});
  if (error) throw new Error(`get_reminder_candidates: ${error.message}`);
  result.candidates = candidates?.length ?? 0;
  if (!candidates?.length) return result;

  const site = await getSiteInfo(supabase);
  const startedAt = Date.now();

  for (const c of candidates) {
    if (Date.now() - startedAt > 50_000) break; // sisakan waktu sebelum batas fungsi
    const { data: logId } = await supabase.rpc("claim_reminder", {
      p_period_id: c.period_id,
      p_user_id: c.user_id,
      p_kind: c.kind,
    });
    if (!logId) {
      result.skipped++;
      continue;
    }
    const send = await sendTelegramMessage(
      c.chat_id,
      reminderMessage({
        fullName: c.full_name,
        amount: c.amount,
        periodKey: c.period_key,
        dueDate: c.due_date,
        mosqueName: site.mosqueName,
        paymentInfo: site.paymentInfo,
        kind: c.kind as Kind,
      }),
      { buttonText: "Buka Halaman Donasi", buttonUrl: `${publicEnv.siteUrl}/akun` },
    );
    if (send.ok) {
      result.sent++;
      await supabase.rpc("finish_reminder", { p_log_id: logId, p_status: "sent" });
    } else {
      result.failed++;
      await supabase.rpc("finish_reminder", { p_log_id: logId, p_status: "failed", p_error: send.error });
      if (send.blocked) await handleBlocked(supabase, c.user_id);
    }
    await new Promise((r) => setTimeout(r, 60)); // < 30 pesan/detik (batas Telegram)
  }
  return result;
}

async function notifyAdminsWeeklyDraft(supabase: ReturnType<typeof createServiceClient>, reportId: string) {
  if (!serverEnv.telegramConfigured()) return;
  try {
    const { data: report } = await supabase.from("financial_reports").select("title").eq("id", reportId).maybeSingle();
    const { data: admins } = await supabase.from("telegram_links").select("chat_id, profiles!inner(role)").eq("profiles.role", "admin");
    const url = `${publicEnv.siteUrl}/admin/laporan/${reportId}`;
    for (const a of admins ?? []) {
      await sendTelegramMessage(
        a.chat_id,
        `📊 <b>${escapeHtml(report?.title ?? "Draf laporan pekanan")}</b> sudah dibuat otomatis.\n\nSilakan periksa angkanya, lalu tekan <b>Publikasikan</b> agar jamaah dapat melihatnya.`,
        { buttonText: "Periksa & Publikasikan", buttonUrl: url },
      );
    }
  } catch (e) {
    console.error("notifyAdminsWeeklyDraft", e);
  }
}

/** Reminder manual dari admin untuk satu tagihan. */
export async function sendManualReminder(periodId: string, adminId: string): Promise<{ ok: boolean; message: string }> {
  if (!serverEnv.telegramConfigured()) return { ok: false, message: "Bot Telegram belum dikonfigurasi." };
  const supabase = createServiceClient();
  const { data: period } = await supabase
    .from("donation_periods")
    .select("id, user_id, amount, period_key, due_date, status, profiles!donation_periods_user_id_fkey(full_name)")
    .eq("id", periodId)
    .maybeSingle();
  if (!period) return { ok: false, message: "Tagihan tidak ditemukan." };
  if (period.status === "paid") return { ok: false, message: "Tagihan ini sudah lunas." };

  const { data: link } = await supabase.from("telegram_links").select("chat_id").eq("user_id", period.user_id).maybeSingle();
  if (!link) return { ok: false, message: "Donatur belum menghubungkan Telegram." };

  const sixHoursAgo = new Date(Date.now() - 6 * 3600_000).toISOString();
  const { count } = await supabase
    .from("reminder_logs")
    .select("id", { count: "exact", head: true })
    .eq("period_id", periodId)
    .eq("kind", "manual")
    .eq("status", "sent")
    .gte("created_at", sixHoursAgo);
  if ((count ?? 0) > 0) return { ok: false, message: "Pengingat untuk tagihan ini sudah dikirim dalam 6 jam terakhir." };

  const site = await getSiteInfo(supabase);
  const send = await sendTelegramMessage(
    link.chat_id,
    reminderMessage({
      fullName: period.profiles?.full_name ?? "",
      amount: period.amount,
      periodKey: period.period_key,
      dueDate: period.due_date,
      mosqueName: site.mosqueName,
      paymentInfo: site.paymentInfo,
      kind: "manual",
    }),
    { buttonText: "Buka Halaman Donasi", buttonUrl: `${publicEnv.siteUrl}/akun` },
  );
  await supabase.from("reminder_logs").insert({
    period_id: periodId,
    user_id: period.user_id,
    kind: "manual",
    status: send.ok ? "sent" : "failed",
    error: send.ok ? null : send.error.slice(0, 500),
    sent_by: adminId,
  });
  if (!send.ok && send.blocked) await handleBlocked(supabase, period.user_id);
  return send.ok
    ? { ok: true, message: "Pengingat berhasil dikirim via Telegram." }
    : { ok: false, message: `Gagal mengirim: ${send.error}` };
}

/** Beri tahu admin (yang menautkan Telegram) bahwa ada konfirmasi pembayaran baru. */
export async function notifyAdminsPaymentConfirmed(periodId: string) {
  if (!serverEnv.telegramConfigured()) return;
  try {
    const supabase = createServiceClient();
    const { data: period } = await supabase
      .from("donation_periods")
      .select("amount, paid_amount, paid_account, period_key, profiles!donation_periods_user_id_fkey(full_name)")
      .eq("id", periodId)
      .maybeSingle();
    if (!period) return;
    const { data: admins } = await supabase
      .from("telegram_links")
      .select("chat_id, profiles!inner(role)")
      .eq("profiles.role", "admin");
    const text = [
      "🔔 <b>Konfirmasi pembayaran baru</b>",
      `Donatur: ${escapeHtml(period.profiles?.full_name ?? "-")}`,
      `Periode: ${escapeHtml(formatPeriodKey(period.period_key))}`,
      `Nominal tagihan: ${escapeHtml(formatRupiah(period.amount))}`,
      period.paid_amount != null
        ? `Dikonfirmasi donatur: <b>${escapeHtml(formatRupiah(period.paid_amount))}</b> (${period.paid_account === "cash" ? "tunai" : "transfer BSI"})`
        : null,
      "",
      "Silakan cek rekening masjid lalu verifikasi di dashboard admin.",
    ].filter((l) => l !== null).join("\n");
    for (const a of admins ?? []) {
      await sendTelegramMessage(a.chat_id, text, {
        buttonText: "Buka Verifikasi",
        buttonUrl: `${publicEnv.siteUrl}/admin/pembayaran`,
      });
    }
  } catch (e) {
    console.error("notifyAdminsPaymentConfirmed", e);
  }
}

/** Ucapan terima kasih ke donatur setelah pembayaran diverifikasi. */
export async function notifyDonorPaymentVerified(periodId: string) {
  if (!serverEnv.telegramConfigured()) return;
  try {
    const supabase = createServiceClient();
    const { data: period } = await supabase
      .from("donation_periods")
      .select("user_id, amount, paid_amount, period_key, profiles!donation_periods_user_id_fkey(full_name)")
      .eq("id", periodId)
      .maybeSingle();
    if (!period) return;
    const { data: link } = await supabase.from("telegram_links").select("chat_id").eq("user_id", period.user_id).maybeSingle();
    if (!link) return;
    const site = await getSiteInfo(supabase);
    await sendTelegramMessage(
      link.chat_id,
      [
        `✅ Pembayaran donasi Anda telah <b>diverifikasi</b>.`,
        "",
        `• Periode: <b>${escapeHtml(formatPeriodKey(period.period_key))}</b>`,
        `• Nominal: <b>${escapeHtml(formatRupiah(period.paid_amount ?? period.amount))}</b>`,
        "",
        `Jazakumullahu khairan, ${escapeHtml(period.profiles?.full_name ?? "Bapak/Ibu")}. Semoga menjadi amal jariyah yang terus mengalir pahalanya. — ${escapeHtml(site.mosqueName)}`,
      ].join("\n"),
    );
  } catch (e) {
    console.error("notifyDonorPaymentVerified", e);
  }
}

/** Beri tahu admin bahwa ada donasi sukarela baru yang menunggu verifikasi. */
export async function notifyAdminsVoluntary(donationId: string) {
  if (!serverEnv.telegramConfigured()) return;
  try {
    const supabase = createServiceClient();
    const { data: d } = await supabase
      .from("voluntary_donations")
      .select("amount, account_id, categories(name), profiles!voluntary_donations_user_id_fkey(full_name)")
      .eq("id", donationId)
      .maybeSingle();
    if (!d) return;
    const { data: admins } = await supabase.from("telegram_links").select("chat_id, profiles!inner(role)").eq("profiles.role", "admin");
    const text = [
      "🔔 <b>Donasi sukarela baru</b>",
      `Donatur: ${escapeHtml(d.profiles?.full_name ?? "-")}`,
      `Jenis: ${escapeHtml(d.categories?.name ?? "-")}`,
      `Nominal: <b>${escapeHtml(formatRupiah(d.amount))}</b> (${d.account_id === "cash" ? "tunai" : "transfer BSI"})`,
      "",
      "Silakan cek dana masuk lalu verifikasi di dashboard admin.",
    ].join("\n");
    for (const a of admins ?? []) {
      await sendTelegramMessage(a.chat_id, text, { buttonText: "Buka Verifikasi", buttonUrl: `${publicEnv.siteUrl}/admin/donasi-lain` });
    }
  } catch (e) {
    console.error("notifyAdminsVoluntary", e);
  }
}

/** Ucapan terima kasih ke donatur setelah donasi sukarela diverifikasi. */
export async function notifyDonorVoluntaryVerified(donationId: string) {
  if (!serverEnv.telegramConfigured()) return;
  try {
    const supabase = createServiceClient();
    const { data: d } = await supabase
      .from("voluntary_donations")
      .select("user_id, amount, categories(name), profiles!voluntary_donations_user_id_fkey(full_name)")
      .eq("id", donationId)
      .maybeSingle();
    if (!d) return;
    const { data: link } = await supabase.from("telegram_links").select("chat_id").eq("user_id", d.user_id).maybeSingle();
    if (!link) return;
    const site = await getSiteInfo(supabase);
    await sendTelegramMessage(
      link.chat_id,
      [
        `✅ ${escapeHtml(d.categories?.name ?? "Donasi")} Anda telah <b>diverifikasi</b>.`,
        "",
        `• Nominal: <b>${escapeHtml(formatRupiah(d.amount))}</b>`,
        "",
        `Jazakumullahu khairan, ${escapeHtml(d.profiles?.full_name ?? "Bapak/Ibu")}. Semoga Allah menerima dan melipatgandakan pahalanya. — ${escapeHtml(site.mosqueName)}`,
      ].join("\n"),
    );
  } catch (e) {
    console.error("notifyDonorVoluntaryVerified", e);
  }
}
