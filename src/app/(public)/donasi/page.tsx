import { BellRing, CheckCircle2, HandHeart, ShieldCheck } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { PaymentInfo } from "@/components/public/payment-info";
import { formatRupiah } from "@/lib/format";
import { getActivePrograms, getSiteSettings } from "@/lib/queries/public";

export const revalidate = 300;
export const metadata = { title: "Program Donasi" };

export default async function DonasiPage() {
  const [settings, programs] = await Promise.all([getSiteSettings(), getActivePrograms()]);
  const steps = [
    { icon: HandHeart, title: "Daftar & atur donasi", text: "Buat akun, lalu tentukan nominal dan jadwal (mingguan/bulanan)." },
    { icon: BellRing, title: "Terima pengingat", text: "Hubungkan Telegram. Pengingat dikirim otomatis saat jatuh tempo." },
    { icon: CheckCircle2, title: "Transfer & konfirmasi", text: "Transfer ke rekening masjid, lalu tekan \"Saya Sudah Bayar\"." },
    { icon: ShieldCheck, title: "Diverifikasi pengurus", text: "Pengurus memeriksa rekening dan mencatatnya di laporan keuangan." },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader title="Program Donasi" description="Mari bersama memakmurkan masjid. Semua donasi tercatat dan dilaporkan secara terbuka." />

      <div className="grid gap-4 sm:grid-cols-2">
        {steps.map((s, i) => (
          <Card key={s.title} className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-lg font-bold text-white">
              {i + 1}
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold">
                <s.icon className="size-4 text-brand-700" aria-hidden /> {s.title}
              </h2>
              <p className="text-slate-700">{s.text}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <LinkButton href="/daftar" size="lg">
          Daftar Donatur Tetap
        </LinkButton>
        <LinkButton href="/masuk" size="lg" variant="secondary">
          Sudah punya akun? Masuk
        </LinkButton>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-bold text-brand-900">Program yang Sedang Berjalan</h2>
          {programs.length ? (
            programs.map((p) => (
              <Card key={p.id}>
                <h3 className="text-lg font-bold">{p.title}</h3>
                {p.description && <p className="mt-2 whitespace-pre-line text-base text-slate-700">{p.description}</p>}
                {p.target_amount && <p className="mt-2 font-semibold text-brand-800">Target: {formatRupiah(p.target_amount)}</p>}
              </Card>
            ))
          ) : (
            <p className="text-slate-600">Belum ada program khusus. Donasi rutin digunakan untuk operasional dan kegiatan masjid.</p>
          )}
        </div>
        <PaymentInfo text={settings.payment_info} />
      </div>
    </div>
  );
}
