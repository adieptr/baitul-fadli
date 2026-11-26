import Link from "next/link";
import { ArrowRight, BellRing, CalendarDays, HandHeart, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { ReportSummary } from "@/components/public/finance";
import { EventCard } from "@/components/public/event-card";
import { PaymentInfo } from "@/components/public/payment-info";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { formatDate, formatRupiah } from "@/lib/format";
import { getActivePrograms, getPublishedReports, getSiteSettings, getUpcomingEvents } from "@/lib/queries/public";

export const revalidate = 300;

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:py-16">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-brand-900 sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-lg text-slate-600">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const [settings, reports, events, programs] = await Promise.all([
    getSiteSettings(),
    getPublishedReports(),
    getUpcomingEvents(3),
    getActivePrograms(),
  ]);
  const latest = reports[0];
  const missions = settings.mission.split("\n").map((m) => m.trim()).filter(Boolean);
  const wa = settings.whatsapp.replace(/[^0-9]/g, "").replace(/^0/, "62");

  return (
    <>
      {/* HERO */}
      <section className="pattern-bg text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="text-lg font-semibold text-gold-100">Assalamu&apos;alaikum warahmatullahi wabarakatuh</p>
          <h1 className="mt-3 text-4xl leading-tight font-extrabold sm:text-5xl">{settings.mosque_name}</h1>
          {settings.tagline && <p className="mt-3 text-xl text-brand-100 sm:text-2xl">{settings.tagline}</p>}
          {settings.welcome_message && (
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-brand-50">{settings.welcome_message}</p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/daftar" variant="gold" size="lg">
              <HandHeart className="size-6" aria-hidden /> Jadi Donatur Tetap
            </LinkButton>
            <LinkButton href="/keuangan" variant="secondary" size="lg" className="border-white">
              <ShieldCheck className="size-6" aria-hidden /> Lihat Laporan Keuangan
            </LinkButton>
          </div>
        </div>
      </section>

      {/* RINGKASAN CEPAT */}
      <div className="mx-auto -mt-8 grid max-w-6xl gap-4 px-4 sm:grid-cols-3">
        <Card className="border-brand-200">
          <p className="text-base font-medium text-slate-600">Saldo Kas Masjid</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-800 tabular-nums">
            {latest ? formatRupiah(latest.closing_balance) : "—"}
          </p>
          <p className="text-sm text-slate-500">{latest ? `Per ${formatDate(latest.period_end)}` : "Belum ada laporan terbit"}</p>
        </Card>
        <Card>
          <p className="text-base font-medium text-slate-600">Agenda Terdekat</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{events[0]?.title ?? "Belum ada agenda"}</p>
          {events[0] && <p className="text-sm text-slate-500">{formatDate(events[0].event_date, { weekday: true })}</p>}
        </Card>
        <Card>
          <p className="text-base font-medium text-slate-600">Pengingat Donasi</p>
          <p className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900">
            <BellRing className="size-5 text-brand-700" aria-hidden /> Otomatis via Telegram
          </p>
          <Link href="/daftar" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
            Daftar sekarang
          </Link>
        </Card>
      </div>

      {/* PROFIL */}
      <Section id="profil" title="Profil Masjid">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h3 className="text-xl font-bold">Sejarah Singkat</h3>
            <p className="mt-3 whitespace-pre-line text-lg text-slate-700">{settings.history || "-"}</p>
          </Card>
          <div className="space-y-6">
            <Card>
              <h3 className="text-xl font-bold">Visi</h3>
              <p className="mt-2 text-lg text-slate-700">{settings.vision || "-"}</p>
            </Card>
            <Card>
              <h3 className="text-xl font-bold">Misi</h3>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-lg text-slate-700">
                {missions.length ? missions.map((m) => <li key={m}>{m}</li>) : <li>-</li>}
              </ul>
            </Card>
          </div>
        </div>
      </Section>

      {/* TRANSPARANSI */}
      <div className="bg-white">
        <Section
          id="keuangan"
          title="Transparansi Keuangan"
          subtitle="Laporan keuangan masjid yang telah diperiksa dan dipublikasikan oleh pengurus."
        >
          {latest ? (
            <>
              <p className="mb-4 text-lg font-semibold text-slate-800">
                {latest.title} · {formatDate(latest.period_start, { short: true })} – {formatDate(latest.period_end, { short: true })}
              </p>
              <ReportSummary report={latest} />
              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton href={`/keuangan/${latest.id}`}>
                  Lihat Rincian Transaksi <ArrowRight className="size-5" aria-hidden />
                </LinkButton>
                <LinkButton href="/keuangan" variant="secondary">
                  Semua Laporan
                </LinkButton>
              </div>
            </>
          ) : (
            <EmptyState title="Belum ada laporan yang dipublikasikan" description="Laporan akan tampil di sini setelah dipublikasikan pengurus." />
          )}
        </Section>
      </div>

      {/* AGENDA */}
      <Section id="agenda" title="Agenda Kegiatan" subtitle="Mari hadir dan meramaikan kegiatan masjid.">
        {events.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <EmptyState title="Belum ada agenda mendatang" />
        )}
        <div className="mt-6">
          <LinkButton href="/agenda" variant="secondary">
            <CalendarDays className="size-5" aria-hidden /> Semua Agenda
          </LinkButton>
        </div>
      </Section>

      {/* DONASI */}
      <div className="bg-white">
        <Section id="donasi" title="Program Donasi" subtitle="Setiap rupiah yang Anda titipkan dicatat dan dilaporkan secara terbuka.">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {programs.length ? (
                programs.map((p) => (
                  <Card key={p.id}>
                    <h3 className="text-xl font-bold">{p.title}</h3>
                    {p.description && <p className="mt-2 whitespace-pre-line text-lg text-slate-700">{p.description}</p>}
                    {p.target_amount && (
                      <p className="mt-2 font-semibold text-brand-800">Target: {formatRupiah(p.target_amount)}</p>
                    )}
                  </Card>
                ))
              ) : (
                <Card>
                  <h3 className="text-xl font-bold">Donatur Tetap Masjid</h3>
                  <p className="mt-2 text-lg text-slate-700">
                    Dukung operasional masjid secara rutin setiap pekan atau setiap bulan.
                  </p>
                </Card>
              )}
            </div>
            <div className="space-y-4">
              <Card className="border-2 border-brand-700 bg-brand-50">
                <h3 className="text-xl font-bold text-brand-900">Jadi Donatur Tetap</h3>
                <ol className="mt-3 list-decimal space-y-1 pl-6 text-lg text-slate-800">
                  <li>Buat akun</li>
                  <li>Tentukan nominal &amp; jadwal</li>
                  <li>Hubungkan Telegram</li>
                  <li>Terima pengingat otomatis</li>
                </ol>
                <LinkButton href="/daftar" size="lg" className="mt-4 w-full">
                  Daftar Sekarang
                </LinkButton>
              </Card>
              <PaymentInfo text={settings.payment_info} />
            </div>
          </div>
        </Section>
      </div>

      {/* KONTAK */}
      <Section id="kontak" title="Kontak & Lokasi">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="space-y-4 text-lg">
            {settings.address && (
              <p className="flex gap-3">
                <MapPin className="mt-1 size-6 shrink-0 text-brand-700" aria-hidden /> {settings.address}
              </p>
            )}
            {settings.phone && (
              <p className="flex gap-3">
                <Phone className="mt-1 size-6 shrink-0 text-brand-700" aria-hidden />
                <a className="font-semibold underline underline-offset-4" href={`tel:${settings.phone.replace(/[^0-9+]/g, "")}`}>
                  {settings.phone}
                </a>
              </p>
            )}
            {settings.email && (
              <p className="flex gap-3">
                <Mail className="mt-1 size-6 shrink-0 text-brand-700" aria-hidden />
                <a className="font-semibold underline underline-offset-4" href={`mailto:${settings.email}`}>
                  {settings.email}
                </a>
              </p>
            )}
            {!settings.address && !settings.phone && !settings.email && <p className="text-slate-600">Informasi kontak belum diisi.</p>}
          </Card>
          <div className="flex flex-col gap-3">
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#1f7a4d] px-6 text-lg font-semibold text-white hover:bg-[#17603c]"
              >
                <MessageCircle className="size-6" aria-hidden /> Hubungi via WhatsApp
              </a>
            )}
            {settings.maps_url && (
              <a
                href={settings.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-brand-700 bg-white px-6 text-lg font-semibold text-brand-800 hover:bg-brand-50"
              >
                <MapPin className="size-6" aria-hidden /> Buka Lokasi di Google Maps
              </a>
            )}
            <InstallPrompt variant="inline" />
          </div>
        </div>
      </Section>
    </>
  );
}
