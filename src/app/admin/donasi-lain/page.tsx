import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoluntaryActions } from "@/components/admin/voluntary-actions";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/queries/admin";
import { ACCOUNT_LABEL } from "@/lib/accounts";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Donasi Lain (Sukarela)" };

const TABS = [
  { key: "awaiting_verification", label: "Menunggu Verifikasi", tone: "warning" },
  { key: "verified", label: "Terverifikasi", tone: "success" },
  { key: "rejected", label: "Ditolak", tone: "danger" },
] as const;

export default async function VoluntaryAdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = TABS.find((t) => t.key === sp.status)?.key ?? "awaiting_verification";
  const supabase = await createClient();
  const [{ data: rows }, counts, allCategories] = await Promise.all([
    supabase
      .from("voluntary_donations")
      .select("id, amount, account_id, category_id, donor_note, admin_note, status, created_at, verified_at, user_id, categories(name), profiles!voluntary_donations_user_id_fkey(full_name, phone)")
      .eq("status", status)
      .order("created_at", { ascending: status !== "verified" })
      .limit(100),
    Promise.all(
      TABS.map(async (t) => {
        const { count } = await supabase.from("voluntary_donations").select("id", { count: "exact", head: true }).eq("status", t.key);
        return [t.key, count ?? 0] as const;
      }),
    ),
    getCategories(),
  ]);
  const countMap = Object.fromEntries(counts);
  const incomeCategories = allCategories.filter((c) => c.type === "income" && c.is_active && !c.is_system);

  return (
    <div className="space-y-6">
      <PageHeader title="Donasi Lain (Sukarela)" description="Shodaqoh, infaq, atau wakaf dari donatur di luar tagihan rutin. Cocokkan dengan mutasi rekening sebelum verifikasi." />
      <nav aria-label="Filter status" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/donasi-lain?status=${t.key}`}
            aria-current={t.key === status ? "page" : undefined}
            className={cn(
              "flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-4 font-semibold",
              t.key === status ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700",
            )}
          >
            {t.label}
            <span className={cn("rounded-full px-2 text-sm", t.key === status ? "bg-white/20" : "bg-slate-100")}>{countMap[t.key]}</span>
          </Link>
        ))}
      </nav>

      {!rows?.length ? (
        <EmptyState title="Tidak ada data" />
      ) : (
        <ul className="space-y-4">
          {rows.map((d) => {
            const phone = d.profiles?.phone ?? "";
            const wa = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
            return (
              <li key={d.id}>
                <Card className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={`/admin/donatur/${d.user_id}`} className="text-base font-bold hover:underline">
                        {d.profiles?.full_name || "(tanpa nama)"}
                      </Link>
                      <p className="flex flex-wrap items-center gap-2 text-slate-600">
                        {formatDateTime(d.created_at)} <Badge tone="info">{d.categories?.name}</Badge>
                        <Badge tone={d.account_id === "bsi" ? "info" : "neutral"}>{ACCOUNT_LABEL[d.account_id] ?? d.account_id}</Badge>
                      </p>
                    </div>
                    <p className="text-lg font-extrabold tabular-nums">{formatRupiah(d.amount)}</p>
                  </div>
                  {(d.donor_note || d.admin_note || d.verified_at) && (
                    <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-base">
                      {d.donor_note && <p>Catatan donatur: “{d.donor_note}”</p>}
                      {d.admin_note && <p>Catatan admin: {d.admin_note}</p>}
                      {d.verified_at && <p>Diverifikasi: {formatDateTime(d.verified_at)}</p>}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <VoluntaryActions donation={d} categories={incomeCategories} />
                    {phone && (
                      <div className="flex gap-2">
                        <a href={`tel:${phone}`} className="inline-flex min-h-9 items-center gap-1 rounded-xl px-3 font-semibold text-slate-700 hover:bg-slate-100">
                          <Phone className="size-4" aria-hidden /> Telepon
                        </a>
                        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-xl px-3 font-semibold text-emerald-800 hover:bg-emerald-50">
                          <MessageCircle className="size-4" aria-hidden /> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
