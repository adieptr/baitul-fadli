import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  FileBarChart,
  HandHeart,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Clock,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { ReportSummary } from "@/components/public/finance";
import { EventCard } from "@/components/public/event-card";
import { PaymentInfo } from "@/components/public/payment-info";
import { MosqueIllustration } from "@/components/public/mosque-illustration";
import { RichText } from "@/components/public/rich-text";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { formatDate, formatRupiah, formatTime } from "@/lib/format";
import { publicMediaUrl } from "@/lib/storage";
import { DEFAULT_PROFILE } from "@/lib/content";
import { getActivePrograms, getPublishedReports, getSiteSettings, getUpcomingEvents } from "@/lib/queries/public";

export const revalidate = 60;

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="text-sm font-semibold tracking-wider text-brand-700 uppercase">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
    </div>
  );
}

function Empty({ icon: Icon, title, text }: { icon: typeof CalendarDays; title: string; text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white/60 p-5">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Icon className="size-5" aria-hidden />
      </div>
      <div>
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="text-sm text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function Cover({ src, alt, eager = false }: { src: string | null; alt: string; eager?: boolean }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="aspect-[4/3] w-full object-cover"
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
    />
  ) : (
    <MosqueIllustration className="block aspect-[4/3] w-full" />
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
  const nextEvent = events[0];
  const heroImage = publicMediaUrl(settings.hero_image_path);
  const profile = settings.profile_content?.trim() || DEFAULT_PROFILE;
  const wa = settings.whatsapp.replace(/[^0-9]/g, "").replace(/^0/, "62");

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-12 md:grid-cols-2 md:pt-16 md:pb-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-800 shadow-sm ring-1 ring-brand-100">
              <span className="size-1.5 rounded-full bg-gold-500" aria-hidden />
              Assalamu&apos;alaikum warahmatullahi wabarakatuh
            </p>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{settings.mosque_name}</h1>
            {settings.tagline && <p className="mt-4 text-lg text-slate-600">{settings.tagline}</p>}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/daftar" size="lg">
                <HandHeart className="size-5" aria-hidden /> Jadi Donatur Tetap
              </LinkButton>
              <LinkButton href="#profil" variant="secondary" size="lg">
                Kenali Masjid Kami
              </LinkButton>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-brand-700" aria-hidden /> Laporan keuangan terbuka
              </li>
              <li className="flex items-center gap-2">
                <BellRing className="size-4 text-brand-700" aria-hidden /> Pengingat donasi via Telegram
              </li>
            </ul>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-brand-100/60 blur-2xl" aria-hidden />
            <div className="relative overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/5">
              <Cover src={heroImage} alt={`Foto ${settings.mosque_name}`} eager />
            </div>
          </div>
        </div>
      </section>

      {/* ================= RINGKASAN ================= */}
      <section aria-label="Ringkasan" className="mx-auto max-w-6xl px-4">
        <div className="grid divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Link href={latest ? `/keuangan/${latest.id}` : "/keuangan"} className="flex items-start gap-3 p-5 hover:bg-slate-50">
            <Wallet className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
            <div>
              <p className="text-sm text-slate-500">Saldo kas masjid</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">{latest ? formatRupiah(latest.closing_balance) : "Segera hadir"}</p>
              <p className="text-xs text-slate-500">{latest ? `Per ${formatDate(latest.period_end)}` : "Menunggu laporan pertama"}</p>
            </div>
          </Link>
          <Link href={nextEvent ? `/agenda/${nextEvent.id}` : "/agenda"} className="flex items-start gap-3 p-5 hover:bg-slate-50">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm text-slate-500">Agenda terdekat</p>
              <p className="line-clamp-1 text-lg font-bold text-slate-900">{nextEvent?.title ?? "Segera diumumkan"}</p>
              <p className="text-xs text-slate-500">
                {nextEvent
                  ? `${formatDate(nextEvent.event_date, { weekday: true })}${nextEvent.start_time ? ` · ${formatTime(nextEvent.start_time)} WIB` : ""}`
                  : "Pantau halaman agenda"}
              </p>
            </div>
          </Link>
          <Link href="#donasi" className="flex items-start gap-3 p-5 hover:bg-slate-50">
            <HandHeart className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
            <div>
              <p className="text-sm text-slate-500">Donasi rutin</p>
              <p className="text-lg font-bold text-slate-900">Mingguan / bulanan</p>
              <p className="text-xs text-slate-500">Diingatkan otomatis, tercatat transparan</p>
            </div>
          </Link>
        </div>
      </section>

      {/* ================= PROFIL (SATU ARTIKEL) ================= */}
      <section id="profil" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:py-20">
        <div className="grid gap-2 lg:grid-cols-[1fr_2fr] lg:gap-10">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeading eyebrow="Profil" title={`Tentang ${settings.mosque_name}`} />
            <div className="hidden overflow-hidden rounded-2xl ring-1 ring-black/5 lg:block">
              <Cover src={heroImage} alt="" />
            </div>
          </div>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 leading-relaxed text-slate-700 shadow-sm sm:p-10">
            <RichText content={profile} />
          </article>
        </div>
      </section>

      {/* ================= TRANSPARANSI ================= */}
      <section id="keuangan" className="scroll-mt-20 border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <SectionHeading
            eyebrow="Transparansi"
            title="Laporan Keuangan"
            subtitle="Setiap pemasukan dan pengeluaran dicatat, diperiksa pengurus, lalu dipublikasikan untuk jamaah."
          />
          {latest ? (
            <>
              <p className="mb-4 text-sm font-medium text-slate-600">
                {latest.title} · {formatDate(latest.period_start, { short: true })} – {formatDate(latest.period_end, { short: true })}
              </p>
              <ReportSummary report={latest} />
              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton href={`/keuangan/${latest.id}`}>
                  Lihat Rincian <ArrowRight className="size-4" aria-hidden />
                </LinkButton>
                <LinkButton href="/keuangan" variant="secondary">
                  Semua Laporan
                </LinkButton>
              </div>
            </>
          ) : (
            <Empty
              icon={FileBarChart}
              title="Laporan pertama sedang disiapkan"
              text="Laporan keuangan akan tampil di sini setelah diperiksa dan dipublikasikan pengurus."
            />
          )}
        </div>
      </section>

      {/* ================= AGENDA ================= */}
      <section id="agenda" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-x-4">
          <SectionHeading eyebrow="Kegiatan" title="Agenda Masjid" subtitle="Mari hadir dan meramaikan kegiatan masjid." />
          <Link href="/agenda" className="mb-8 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            Semua agenda <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {events.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <Empty icon={CalendarDays} title="Agenda segera diumumkan" text="Kajian, kegiatan sosial, dan acara masjid akan tampil di sini." />
        )}
      </section>

      {/* ================= DONASI ================= */}
      <section id="donasi" className="scroll-mt-20 bg-brand-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-wider text-gold-500 uppercase">Donasi</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Jadi bagian dari kemakmuran masjid</h2>
            <p className="mt-3 text-brand-100">
              Dukung operasional dan kegiatan masjid secara rutin. Setiap amanah dicatat dan dilaporkan secara terbuka.
            </p>
            <ol className="mt-8 space-y-5">
              {[
                ["Daftar & atur donasi", "Tentukan nominal serta jadwal mingguan atau bulanan."],
                ["Terima pengingat", "Hubungkan Telegram, pengingat dikirim otomatis saat jatuh tempo."],
                ["Transfer & konfirmasi", "Pengurus memverifikasi dan mencatatnya di laporan keuangan."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-gold-500 ring-1 ring-white/20">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-brand-100">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/daftar" variant="gold" size="lg">
                Daftar Donatur Tetap
              </LinkButton>
              <LinkButton href="/masuk" size="lg" className="bg-white/10 ring-1 ring-white/20 hover:bg-white/20">
                Sudah punya akun? Masuk
              </LinkButton>
            </div>
          </div>
          <div className="space-y-4">
            {programs.length ? (
              programs.map((p) => (
                <div key={p.id} className="rounded-2xl bg-white p-6 text-slate-700">
                  <h3 className="text-lg font-bold text-slate-900">{p.title}</h3>
                  {p.description && <p className="mt-2 whitespace-pre-line">{p.description}</p>}
                  {p.target_amount && <p className="mt-3 text-sm font-semibold text-brand-800">Target: {formatRupiah(p.target_amount)}</p>}
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-white p-6 text-slate-700">
                <h3 className="text-lg font-bold text-slate-900">Operasional & Kegiatan Masjid</h3>
                <p className="mt-2">
                  Donasi rutin digunakan untuk listrik, air, kebersihan, perawatan bangunan, serta kegiatan dakwah,
                  pendidikan, dan sosial bagi jamaah.
                </p>
              </div>
            )}
            {settings.payment_info ? (
              <PaymentInfo text={settings.payment_info} />
            ) : (
              <p className="rounded-2xl bg-white/10 p-5 text-sm text-brand-100 ring-1 ring-white/15">
                Informasi rekening resmi masjid dapat ditanyakan langsung kepada pengurus.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ================= KONTAK ================= */}
      <section id="kontak" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:py-20">
        <SectionHeading eyebrow="Kontak" title="Kunjungi & hubungi kami" />
        <div className="max-w-3xl space-y-6">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {settings.address && (
              <p className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden /> {settings.address}
              </p>
            )}
            {settings.phone && (
              <p className="flex gap-3">
                <Phone className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
                <a className="font-medium hover:underline" href={`tel:${settings.phone.replace(/[^0-9+]/g, "")}`}>
                  {settings.phone}
                </a>
              </p>
            )}
            {settings.email && (
              <p className="flex gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
                <a className="font-medium hover:underline" href={`mailto:${settings.email}`}>
                  {settings.email}
                </a>
              </p>
            )}
            {settings.service_hours && (
              <p className="flex gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden /> {settings.service_hours}
              </p>
            )}
            {!settings.address && !settings.phone && !settings.email && (
              <p className="text-slate-600">
                Silakan datang langsung ke masjid atau temui pengurus selepas shalat berjamaah. Pintu masjid selalu terbuka
                untuk jamaah.
              </p>
            )}
            {(wa || settings.maps_url) && (
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                {wa && (
                  <a
                    href={`https://wa.me/${wa}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#1f7a4d] px-4 text-sm font-semibold text-white hover:bg-[#17603c]"
                  >
                    <MessageCircle className="size-4" aria-hidden /> WhatsApp Pengurus
                  </a>
                )}
                {settings.maps_url && (
                  <a
                    href={settings.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-brand-700 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50"
                  >
                    <MapPin className="size-4" aria-hidden /> Buka di Google Maps
                  </a>
                )}
              </div>
            )}
          </div>
          <InstallPrompt variant="inline" />
        </div>
      </section>
    </>
  );
}
