import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { escapeHtml, sendTelegramMessage } from "@/lib/telegram";
import { safeEqual, sha256Hex } from "@/lib/crypto";
import { serverEnv } from "@/lib/server-env";
import { publicEnv } from "@/lib/env";
import { FREQUENCY_LABEL, PERIOD_STATUS, formatPeriodKey, formatRupiah, scheduleLabel } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TgMessage = {
  text?: string;
  chat?: { id: number; type: string };
  from?: { username?: string; first_name?: string };
};

const HELP = [
  "Perintah yang tersedia:",
  "/status — lihat status donasi Anda",
  "/putuskan — putuskan tautan akun",
  "/bantuan — tampilkan bantuan ini",
  "",
  `Untuk menautkan akun, buka ${publicEnv.siteUrl}/akun/profil lalu tekan tombol "Hubungkan ke Telegram".`,
].join("\n");

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!safeEqual(secret, serverEnv.telegramWebhookSecret())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as { message?: TgMessage } | null;
  const msg = update?.message;
  const chatId = msg?.chat?.id;
  if (!chatId || msg?.chat?.type !== "private" || typeof msg.text !== "string") {
    return NextResponse.json({ ok: true });
  }

  try {
    await handleMessage(chatId, msg.text.trim(), msg.from?.username ?? null);
  } catch (e) {
    console.error("[telegram] webhook error", e);
  }
  // Selalu 200 agar Telegram tidak mengulang update yang sama.
  return NextResponse.json({ ok: true });
}

async function handleMessage(chatId: number, text: string, username: string | null) {
  const [rawCmd, arg] = text.split(/\s+/, 2);
  const cmd = rawCmd.toLowerCase().replace(/@.*$/, "");
  const supabase = createServiceClient();

  if (cmd === "/start") {
    if (arg && /^[A-Za-z0-9_-]{20,64}$/.test(arg)) {
      const { data, error } = await supabase.rpc("link_telegram_account", {
        p_token_hash: sha256Hex(arg),
        p_chat_id: chatId,
        p_username: username ?? "",
      });
      if (error) throw error;
      const linked = data?.[0];
      if (linked) {
        await sendTelegramMessage(
          chatId,
          [
            `Assalamu'alaikum, <b>${escapeHtml(linked.full_name || "Bapak/Ibu")}</b> 🙏`,
            "",
            "✅ Akun Anda berhasil terhubung dengan bot Masjid Baitul Fadli.",
            "Pengingat donasi akan dikirim otomatis ke sini sesuai jadwal Anda.",
            "",
            "Silakan kembali ke website untuk melihat status donasi.",
          ].join("\n"),
        );
      } else {
        await sendTelegramMessage(
          chatId,
          "⚠️ Kode penautan tidak valid atau sudah kedaluwarsa (berlaku 15 menit).\n\nSilakan buka halaman profil di website lalu tekan tombol \"Hubungkan ke Telegram\" sekali lagi.",
        );
      }
      return;
    }
    await sendTelegramMessage(
      chatId,
      `Assalamu'alaikum 🙏\nSelamat datang di bot resmi <b>Masjid Baitul Fadli</b>.\n\n${escapeHtml(HELP)}`,
    );
    return;
  }

  if (cmd === "/status") {
    const { data: link } = await supabase.from("telegram_links").select("user_id").eq("chat_id", chatId).maybeSingle();
    if (!link) {
      await sendTelegramMessage(chatId, `Akun Telegram ini belum terhubung.\n\n${escapeHtml(HELP)}`);
      return;
    }
    const [{ data: sub }, { data: periods }] = await Promise.all([
      supabase
        .from("donor_subscriptions")
        .select("amount, frequency, day_of_week, day_of_month, status")
        .eq("user_id", link.user_id)
        .maybeSingle(),
      supabase
        .from("donation_periods")
        .select("period_key, amount, status")
        .eq("user_id", link.user_id)
        .order("due_date", { ascending: false })
        .limit(3),
    ]);
    if (!sub) {
      await sendTelegramMessage(chatId, `Anda belum terdaftar sebagai donatur tetap.\nDaftar di: ${publicEnv.siteUrl}/akun/donasi`);
      return;
    }
    const lines = [
      "<b>Status donasi Anda</b>",
      `• Nominal: ${escapeHtml(formatRupiah(sub.amount))} (${FREQUENCY_LABEL[sub.frequency]})`,
      `• Jadwal: ${escapeHtml(scheduleLabel(sub))}`,
      "",
      "<b>Tagihan terakhir:</b>",
      ...(periods?.length
        ? periods.map((p) => `• ${escapeHtml(formatPeriodKey(p.period_key))}: ${PERIOD_STATUS[p.status].label}`)
        : ["• Belum ada tagihan."]),
    ];
    await sendTelegramMessage(chatId, lines.join("\n"));
    return;
  }

  if (cmd === "/putuskan" || cmd === "/stop") {
    const { data } = await supabase.from("telegram_links").delete().eq("chat_id", chatId).select("user_id");
    await sendTelegramMessage(
      chatId,
      data?.length
        ? "Tautan akun telah diputuskan. Anda tidak akan menerima pengingat lagi. Anda dapat menautkan kembali kapan saja dari website."
        : "Akun Telegram ini memang belum terhubung.",
    );
    return;
  }

  await sendTelegramMessage(chatId, escapeHtml(HELP));
}
