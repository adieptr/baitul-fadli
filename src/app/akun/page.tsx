import Link from "next/link";
import { BellRing, CalendarClock, HandHeart, Hourglass } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PeriodStatusBadge, SubscriptionBadge } from "@/components/ui/badge";
import { PaymentInfo } from "@/components/public/payment-info";
import { ConfirmPaymentForm } from "@/components/donor/confirm-payment";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { requireUser } from "@/lib/auth";
import { getDonorData } from "@/lib/queries/donor";
import { getSiteSettings } from "@/lib/queries/public";
import { FREQUENCY_LABEL, formatDate, formatPeriodKey, formatRupiah, scheduleLabel } from "@/lib/format";
import { nextDueDate } from "@/lib/schedule";

export const metadata = { title: "Akun Saya" };

export default async function DonorHomePage({ searchParams }: { searchParams: Promise<{ konfirmasi?: string }> }) {
  const { konfirmasi } = await searchParams;
  const user = await requireUser();
  const [{ subscription, periods, telegram }, settings] = await Promise.all([getDonorData(user.id), getSiteSettings()]);
  const actionable = periods.filter((p) => p.status === "pending" || p.status === "unpaid");
  const waiting = periods.filter((p) => p.status === "awaiting_verification");
  const firstName = user.fullName.split(" ")[0] || "Bapak/Ibu";

  return (
    <div className="space-y-6">
      {konfirmasi && (
        <div role="status" className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-lg text-emerald-900">
          ✅ <b>Terima kasih!</b> Konfirmasi pembayaran Anda sudah kami terima dan akan segera diverifikasi oleh pengurus masjid.
          Jazakumullahu khairan.
        </div>
      )}
      <div>
        <p className="text-lg text-slate-600">Assalamu&apos;alaikum,</p>
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{user.fullName || firstName}</h1>
      </div>

      {!subscription ? (
        <Card className="border-2 border-brand-700 bg-brand-50">
          <HandHeart className="size-10 text-brand-700" aria-hidden />
          <h2 className="mt-2 text-xl font-bold">Jadilah donatur tetap</h2>
          <p className="mt-1 text-lg text-slate-700">
            Atur nominal dan jadwal donasi rutin Anda. Kami akan mengingatkan Anda melalui Telegram.
          </p>
          <LinkButton href="/akun/donasi" size="lg" className="mt-4 w-full sm:w-auto">
            Atur Donasi Sekarang
          </LinkButton>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Donasi Rutin Saya</h2>
            <SubscriptionBadge status={subscription.status} />
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-slate-600">Nominal</dt>
              <dd className="text-2xl font-extrabold text-brand-800 tabular-nums">{formatRupiah(subscription.amount)}</dd>
              <dd className="text-slate-600">{FREQUENCY_LABEL[subscription.frequency]}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Jadwal Pengingat</dt>
              <dd className="text-lg font-semibold">{scheduleLabel(subscription)}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Jatuh Tempo Berikutnya</dt>
              <dd className="flex items-center gap-2 text-lg font-semibold">
                <CalendarClock className="size-5 text-brand-700" aria-hidden />
                {subscription.status === "active" ? formatDate(nextDueDate(subscription), { weekday: true }) : "—"}
              </dd>
            </div>
          </dl>
          <Link href="/akun/donasi" className="mt-4 inline-block font-semibold text-brand-800 underline underline-offset-4">
            Ubah pengaturan donasi
          </Link>
        </Card>
      )}

      {actionable.length > 0 && (
        <section aria-labelledby="tagihan" className="space-y-4">
          <h2 id="tagihan" className="text-xl font-bold">
            Perlu Dibayar
          </h2>
          {actionable.map((p) => (
            <Card key={p.id} className="border-2 border-amber-300">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">{formatPeriodKey(p.period_key)}</p>
                  <p className="text-slate-600">Jatuh tempo {formatDate(p.due_date, { weekday: true })}</p>
                </div>
                <PeriodStatusBadge status={p.status} />
              </div>
              <p className="my-3 text-3xl font-extrabold text-slate-900 tabular-nums">{formatRupiah(p.amount)}</p>
              <ConfirmPaymentForm periodId={p.id} periodKey={p.period_key} amount={Number(p.amount)} userId={user.id} />
            </Card>
          ))}
          <PaymentInfo text={settings.payment_info} />
        </section>
      )}

      {waiting.length > 0 && (
        <Card className="border-sky-300 bg-sky-50">
          <h2 className="flex items-center gap-2 text-lg font-bold text-sky-900">
            <Hourglass className="size-5" aria-hidden /> Menunggu Verifikasi Pengurus
          </h2>
          <ul className="mt-2 space-y-2">
            {waiting.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {formatPeriodKey(p.period_key)} — <b>{formatRupiah(p.amount)}</b>
                </span>
                <PeriodStatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {subscription && actionable.length === 0 && waiting.length === 0 && (
        <Card className="bg-emerald-50">
          <p className="text-lg text-emerald-900">
            ✅ Tidak ada tagihan yang perlu dibayar saat ini. Jazakumullahu khairan atas kontribusi Anda.
          </p>
        </Card>
      )}

      {subscription && !telegram && (
        <Card className="border-2 border-sky-300">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <BellRing className="size-5 text-sky-700" aria-hidden /> Aktifkan pengingat Telegram
          </h2>
          <p className="mt-1 text-slate-700">Agar tidak lupa, hubungkan akun Telegram Anda. Hanya butuh 1 menit.</p>
          <LinkButton href="/akun/profil#telegram" variant="secondary" className="mt-3">
            Hubungkan Telegram
          </LinkButton>
        </Card>
      )}

      {periods.length > 0 && (
        <div className="text-right">
          <Link href="/akun/riwayat" className="font-semibold text-brand-800 underline underline-offset-4">
            Lihat semua riwayat donasi →
          </Link>
        </div>
      )}
      <InstallPrompt variant="inline" />
    </div>
  );
}
