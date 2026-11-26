import { NextResponse, type NextRequest } from "next/server";
import { runDailyReminders } from "@/lib/notifications";
import { safeEqual } from "@/lib/crypto";
import { serverEnv } from "@/lib/server-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dipanggil Vercel Cron (GET, header Authorization: Bearer CRON_SECRET)
 * atau scheduler cadangan (Supabase pg_cron / GitHub Actions).
 */
async function handle(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!safeEqual(token, serverEnv.cronSecret())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDailyReminders();
    console.log("[cron] reminders", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron] reminders failed", e);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
