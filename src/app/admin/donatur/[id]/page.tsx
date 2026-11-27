import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui/card";
import { PeriodStatusBadge, SubscriptionBadge } from "@/components/ui/badge";
import { ActionForm, ConfirmButton } from "@/components/ui/form";
import { PeriodActions } from "@/components/admin/period-actions";
import { displayEmail } from "@/lib/synthetic-email";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { DeleteAccountButton } from "@/components/admin/delete-account-button";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { adminSetSubscriptionStatusAction } from "@/lib/actions/admin-donors";
import { FREQUENCY_LABEL, formatDate, formatDateTime, formatPeriodKey, formatRupiah, scheduleLabel } from "@/lib/format";
import { nextDueDate } from "@/lib/schedule";

export const metadata = { title: "Detail Donatur" };

export default async function DonorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: profile }, { data: sub }, { data: periods }, { data: telegram }, { data: reminders }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, email, role, created_at").eq("id", id).maybeSingle(),
    supabase.from("donor_subscriptions").select("*").eq("user_id", id).maybeSingle(),
    supabase.from("donation_periods").select("*").eq("user_id", id).order("due_date", { ascending: false }).limit(200),
    supabase.from("telegram_links").select("telegram_username, linked_at").eq("user_id", id).maybeSingle(),
    supabase.from("reminder_logs").select("id, kind, status, error, created_at, period_id").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  if (!profile) notFound();
  const paid = (periods ?? []).filter((p) => p.status === "paid");
  const totalPaid = paid.reduce((s, p) => s + Number(p.amount), 0);
  const wa = (profile.phone ?? "").replace(/[^0-9]/g, "").replace(/^0/, "62");

  return (
    <div className="space-y-6">
      <Link href="/admin/donatur" className="inline-flex min-h-10 items-center gap-2 font-semibold text-brand-800">
        <ArrowLeft className="size-4" aria-hidden /> Semua donatur
      </Link>
      <PageHeader title={profile.full_name || "(tanpa nama)"} description={`Terdaftar ${formatDateTime(profile.created_at)}`} action={sub && <SubscriptionBadge status={sub.status} />} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-2">
          <h2 className="text-base font-bold">Kontak</h2>
          {profile.phone && (
            <p className="flex flex-wrap items-center gap-3">
              <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-2 font-semibold underline"><Phone className="size-4" aria-hidden /> {profile.phone}</a>
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline"><MessageCircle className="size-4" aria-hidden /> WA</a>
            </p>
          )}
          {displayEmail(profile.email) && <p className="flex items-center gap-2 break-all"><Mail className="size-4 shrink-0" aria-hidden /> {profile.email}</p>}
          <p className="flex items-center gap-2"><Send className="size-4" aria-hidden /> {telegram ? `Terhubung${telegram.telegram_username ? ` (@${telegram.telegram_username})` : ""}` : "Belum terhubung Telegram"}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <ResetPasswordButton userId={profile.id} name={profile.full_name} phone={profile.phone} />
            {profile.role !== "admin" && <DeleteAccountButton userId={profile.id} name={profile.full_name} from="donatur" />}
          </div>
        </Card>
        <StatCard label="Total Donasi Terverifikasi" value={formatRupiah(totalPaid)} tone="brand" hint={`${paid.length} periode lunas`} />
        <Card>
          <h2 className="text-base font-bold">Pengaturan Donasi</h2>
          {sub ? (
            <div className="mt-2 space-y-1">
              <p className="text-lg font-bold">{formatRupiah(sub.amount)} <span className="text-base font-normal">/ {FREQUENCY_LABEL[sub.frequency].toLowerCase()}</span></p>
              <p>{scheduleLabel(sub)}</p>
              {sub.status === "active" && <p className="text-slate-600">Berikutnya: {formatDate(nextDueDate(sub), { weekday: true })}</p>}
              <ActionForm action={adminSetSubscriptionStatusAction} className="pt-2">
                <input type="hidden" name="id" value={sub.id} />
                {sub.status === "active" ? (
                  <ConfirmButton label="Jeda Donatur" variant="secondary" size="sm" title="Jeda donatur ini?" message="Tagihan & pengingat baru tidak dibuat selama dijeda." confirmName="status" confirmValue="paused" />
                ) : (
                  <ConfirmButton label="Aktifkan" size="sm" title="Aktifkan kembali?" message="Tagihan & pengingat akan dibuat sesuai jadwal." confirmName="status" confirmValue="active" />
                )}
              </ActionForm>
            </div>
          ) : (
            <p className="mt-2 text-slate-600">Belum mendaftar donasi rutin.</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-bold">Riwayat Tagihan</h2>
        {!periods?.length ? (
          <EmptyState title="Belum ada tagihan" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {periods.map((p) => (
              <li key={p.id} className="space-y-2 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">{formatPeriodKey(p.period_key)}</p>
                    <p className="text-sm text-slate-600">
                      Jatuh tempo {formatDate(p.due_date, { short: true })}
                      {p.donor_note && ` · “${p.donor_note}”`}
                      {p.admin_note && ` · Admin: ${p.admin_note}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold tabular-nums">{formatRupiah(p.amount)}</span>
                    <PeriodStatusBadge status={p.status} />
                  </div>
                </div>
                <PeriodActions period={p} donorName={profile.full_name} hasTelegram={Boolean(telegram)} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold">Log Pengingat Telegram</h2>
        {!reminders?.length ? (
          <p className="text-slate-600">Belum ada pengingat terkirim.</p>
        ) : (
          <ul className="space-y-2 text-base">
            {reminders.map((r) => (
              <li key={r.id}>
                {formatDateTime(r.created_at)} · {{ due: "Otomatis (jatuh tempo)", followup: "Otomatis (lanjutan)", manual: "Manual" }[r.kind as "due"]} ·{" "}
                <b className={r.status === "sent" ? "text-emerald-700" : "text-red-700"}>{r.status === "sent" ? "Terkirim" : r.status === "failed" ? "Gagal" : r.status}</b>
                {r.error && <span className="text-sm text-slate-600"> ({r.error})</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
