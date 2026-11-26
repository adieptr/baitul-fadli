import "server-only";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Environment variable ${name} belum diatur.`);
  return value;
}

export const serverEnv = {
  supabaseSecretKey: () =>
    required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY),
  telegramBotToken: () => required("TELEGRAM_BOT_TOKEN", process.env.TELEGRAM_BOT_TOKEN),
  telegramWebhookSecret: () => required("TELEGRAM_WEBHOOK_SECRET", process.env.TELEGRAM_WEBHOOK_SECRET),
  cronSecret: () => required("CRON_SECRET", process.env.CRON_SECRET),
  telegramConfigured: () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET),
};
