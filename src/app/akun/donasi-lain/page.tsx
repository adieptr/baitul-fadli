import { HandHeart } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentInfo } from "@/components/public/payment-info";
import { VoluntaryDonationForm } from "@/components/donor/voluntary-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/queries/public";
import { ACCOUNT_LABEL } from "@/lib/accounts";
import { formatDateTime, formatRupiah } from "@/lib/format";

export const metadata = { title: "Shodaqoh / Donasi Lain" };

const STATUS: Record<string, { label: string; tone: "warning" | "success" | "danger" }> = {
  awaiting_verification: { label: "Menunggu Verifikasi", tone: "warning" },
  verified: { label: "Terverifikasi", tone: "success" },
  rejected: { label: "Ditolak", tone: "danger" },
};

export default async function VoluntaryDonationPage({ searchParams }: { searchParams: Promise<{ terkirim?: string }> }) {
  const { terkirim } = await searchParams;
  const user = await requireUser("/akun/donasi-lain");
  const supabase = await createClient();
  const [settings, { data: categories }, { data: mine }] = await Promise.all([
    getSiteSettings(),
    supabase.from("categories").select("id, name").eq("type", "income").eq("is_active", true).eq("donor_selectable", true).order("sort_order").order("name"),
    supabase
      .from("voluntary_donations")
      .select("id, amount, account_id, status, admin_note, created_at, categories(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-6">
      {terkirim && (
        <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-base text-emerald-900">
          Terima kasih. Donasi Anda sudah kami terima dan akan diverifikasi pengurus. Jazakumullahu khairan.
        </div>
      )}
      <PageHeader title="Shodaqoh / Donasi Lain" description="Berbagi di luar donasi rutin. Tidak terikat tagihan dan bisa kapan saja." />
      <PaymentInfo text={settings.payment_info} />
      <Card>
        {categories?.length ? (
          <VoluntaryDonationForm categories={categories} />
        ) : (
          <p className="text-slate-600">Belum ada jenis donasi yang dibuka. Silakan hubungi pengurus masjid.</p>
        )}
      </Card>

      {mine && mine.length > 0 && (
        <section aria-labelledby="riwayat-lain" className="space-y-3">
          <h2 id="riwayat-lain" className="flex items-center gap-2 text-lg font-bold">
            <HandHeart className="size-5 text-brand-700" aria-hidden /> Donasi Saya
          </h2>
          <ul className="space-y-3">
            {mine.map((d) => {
              const s = STATUS[d.status] ?? STATUS.awaiting_verification;
              return (
                <li key={d.id}>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{d.categories?.name}</p>
                        <p className="text-sm text-slate-600">
                          {formatDateTime(d.created_at)} · {ACCOUNT_LABEL[d.account_id] ?? d.account_id}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold tabular-nums">{formatRupiah(d.amount)}</p>
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </div>
                    </div>
                    {d.admin_note && <p className="mt-2 text-sm text-slate-600">Catatan pengurus: {d.admin_note}</p>}
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
