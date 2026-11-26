import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { AuditTimeline } from "@/components/admin/audit-timeline";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";

export const metadata = { title: "Log Aktivitas" };
const PAGE_SIZE = 40;

const ENTITIES = [
  { key: "", label: "Semua" },
  { key: "transactions", label: "Transaksi" },
  { key: "financial_reports", label: "Laporan" },
  { key: "donation_periods", label: "Pembayaran" },
  { key: "donor_subscriptions", label: "Donatur" },
  { key: "events", label: "Agenda" },
  { key: "profiles", label: "Role" },
  { key: "site_settings", label: "Pengaturan" },
];

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ entity?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const entity = ENTITIES.some((e) => e.key === sp.entity) ? sp.entity : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase
    .from("audit_logs")
    .select("id, action, entity, entity_id, details, created_at, profiles(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (entity) query = query.eq("entity", entity);
  const { data, count } = await query;

  return (
    <div className="space-y-6">
      <PageHeader title="Log Aktivitas" description="Jejak seluruh perubahan penting. Log tidak dapat diubah atau dihapus dari aplikasi." />
      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter log">
        {ENTITIES.map((e) => (
          <Link
            key={e.key}
            href={`/admin/audit${e.key ? `?entity=${e.key}` : ""}`}
            className={cn(
              "flex min-h-9 shrink-0 items-center rounded-full border px-4 font-semibold",
              e.key === entity ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700",
            )}
          >
            {e.label}
          </Link>
        ))}
      </nav>
      <Card>
        <AuditTimeline entries={data ?? []} showEntity />
      </Card>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/audit" baseParams={{ entity: entity || undefined }} />
    </div>
  );
}
