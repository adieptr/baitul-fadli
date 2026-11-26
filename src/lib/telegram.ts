import "server-only";
import { serverEnv } from "@/lib/server-env";

// Dapat diarahkan ke server tiruan saat pengujian lokal.
const API = (process.env.TELEGRAM_API_BASE_URL ?? "https://api.telegram.org").replace(/\/$/, "");

export type TelegramResult = { ok: true } | { ok: false; error: string; blocked?: boolean };

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function call(method: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${API}/bot${serverEnv.telegramBotToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok && json.ok === true, status: res.status, json };
}

export async function sendTelegramMessage(
  chatId: number | string,
  html: string,
  opts?: { buttonText?: string; buttonUrl?: string },
): Promise<TelegramResult> {
  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    };
    // Telegram hanya menerima tombol URL https (bukan localhost).
    if (opts?.buttonText && opts.buttonUrl?.startsWith("https://")) {
      body.reply_markup = { inline_keyboard: [[{ text: opts.buttonText, url: opts.buttonUrl }]] };
    }
    const r = await call("sendMessage", body);
    if (r.ok) return { ok: true };
    const description = String(r.json.description ?? `HTTP ${r.status}`);
    return { ok: false, error: description, blocked: r.status === 403 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menghubungi Telegram" };
  }
}

export async function setTelegramWebhook(url: string) {
  const r = await call("setWebhook", {
    url,
    secret_token: serverEnv.telegramWebhookSecret(),
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
  await call("setMyCommands", {
    commands: [
      { command: "start", description: "Mulai / tautkan akun" },
      { command: "status", description: "Lihat status donasi" },
      { command: "putuskan", description: "Putuskan tautan akun" },
      { command: "bantuan", description: "Bantuan" },
    ],
  });
  return { ok: r.ok, description: String(r.json.description ?? "") };
}

export async function getTelegramWebhookInfo() {
  const r = await call("getWebhookInfo", {});
  const result = (r.json.result ?? {}) as Record<string, unknown>;
  return {
    ok: r.ok,
    url: String(result.url ?? ""),
    pending: Number(result.pending_update_count ?? 0),
    lastError: result.last_error_message ? String(result.last_error_message) : null,
  };
}
