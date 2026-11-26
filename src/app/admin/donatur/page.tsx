import Link from "next/link";
import { ChevronRight, Send } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Badge, PeriodStatusBadge, SubscriptionBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { FREQUENCY_LABEL, formatPeriodKey, formatRupiah, scheduleLabel, type PeriodStatus } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Donatur Tetap" };

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Aktif" },
  { key: "unpaid", label: "Belum Bayar" },
  { key: "no-telegram", label: "Belum Terhubung Telegram" },
  { key: "paused", label: "Dijeda" },
  { key: "stopped", label: "Berhenti" },
] as const;

export default async function DonorsPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.key === sp.filter) ? sp.filter! : "all";
  const q = (sp.q ?? "").trim().slice(0, 60);
  const supabase = await createClient();

  let query = supabase
    .from("donor_subscriptions")
    .select("id, user_id, amount, frequency, day_of_week, day_of_month, status, started_at, profiles!inner(full_name, phone, email, telegram_links(telegram_username))")
    .order("created_at", { ascending: false })
    .limit(500);
  if (filter === "active" || filter === "paused" || filter === "stopped") query = query.eq("status", filter);
  if (q) query = query.ilike("profiles.full_name", `%${q.replace(/[%_\\]/g, "\\$&")}%`);
  if (filter === "unpaid") {
    const { data: unpaid } = await supabase.from("donation_periods").select("user_id").in("status", ["pending", "unpaid"]).limit(2000);
    const ids = [...new Set((unpaid ?? []).map((u) => u.user_id))];
    query = query.in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  const { data: subsRaw } = await query;
  const subs = (subsRaw ?? []).filter((s) => filter !== "no-telegram" || !s.profiles.telegram_links);

  const ids = subs.map((s) => s.user_id);
  const { data: periods } = ids.length
    ? await supabase
        .from("donation_periods")
        .select("user_id, period_key, status, due_date")
        .in("user_id", ids)
        .order("due_date", { ascending: false })
        .limit(2000)
    : { data: [] };
  const latest = new Map<string, { period_key: string; status: PeriodStatus }>();
  const outstanding = new Map<string, number>();
  for (const p of periods ?? []) {
    if (!latest.has(p.user_id)) latest.set(p.user_id, p);
    if (p.status === "pending" || p.status === "unpaid") outstanding.set(p.user_id, (outstanding.get(p.user_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Donatur Tetap" description={`${subs.length} donatur ditampilkan`} />
      <Card>
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="filter" value={filter} />
          <label className="flex-1 space-y-1">
            <span className="block font-semibold">Cari nama donatur</span>
            <input name="q" defaultValue={q} className="block min-h-12 w-full rounded-xl border-2 border-slate-300 px-3" />
          </label>
          <Button type="submit" variant="secondary">Cari</Button>
        </form>
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Filter donatur">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/donatur?filter=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={f.key === filter ? "page" : undefined}
              className={cn(
                "flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 font-semibold",
                f.key === filter ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </Card>

      {!subs.length ? (
        <EmptyState title="Tidak ada donatur pada filter ini" />
      ) : (
        <ul className="space-y-3">
          {subs.map((s) => {
            const l = latest.get(s.user_id);
            const out = outstanding.get(s.user_id) ?? 0;
            return (
              <li key={s.id}>
                <Link href={`/admin/donatur/${s.user_id}`} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-600">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
                      {s.profiles.full_name || "(tanpa nama)"} <SubscriptionBadge status={s.status} />
                      {s.profiles.telegram_links ? (
                        <Badge tone="info"><Send className="size-3.5" aria-hidden /> Telegram</Badge>
                      ) : (
                        <Badge tone="neutral">Tanpa Telegram</Badge>
                      )}
                    </p>
                    <p className="text-slate-600">
                      {formatRupiah(s.amount)} · {FREQUENCY_LABEL[s.frequency]} · {scheduleLabel(s)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      {l ? (
                        <>
                          <span className="text-slate-600">Terakhir: {formatPeriodKey(l.period_key)}</span>
                          <PeriodStatusBadge status={l.status} />
                        </>
                      ) : (
                        <span className="text-slate-500">Belum ada tagihan</span>
                      )}
                      {out > 0 && <Badge tone="danger">{out} tagihan belum lunas</Badge>}
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
