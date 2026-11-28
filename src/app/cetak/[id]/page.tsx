import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { PrintToolbar } from "@/components/reports/print-toolbar";
import { getPublishedReport, getSiteSettings } from "@/lib/queries/public";
import { formatDate, formatRupiah } from "@/lib/format";
import { publicEnv } from "@/lib/env";

export const revalidate = 60;
export const metadata: Metadata = { title: "Cetak Laporan Keuangan", robots: { index: false, follow: false } };

export async function generateStaticParams() {
  return [];
}

const css = `
  @page { size: A4 portrait; margin: 0; }
  html, body { background: #e2e8f0; }
  .sheet {
    width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; color: #0f172a;
    padding: 14mm 15mm; box-sizing: border-box; display: flex; flex-direction: column;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    box-shadow: 0 4px 24px rgba(15, 23, 42, .15);
  }
  .head { display: flex; align-items: center; gap: 6mm; padding-bottom: 5mm; border-bottom: 1.6mm solid #1f3d6d; }
  .head img { width: 22mm; height: 22mm; border-radius: 4mm; }
  .head h1 { margin: 0; font-size: 22pt; font-weight: 800; letter-spacing: .02em; color: #1f3d6d; line-height: 1.1; }
  .head p { margin: 1.5mm 0 0; font-size: 9.5pt; color: #475569; }
  .rule { height: .6mm; background: #4f7cc0; margin-top: 1.2mm; }
  .title { text-align: center; margin: 7mm 0 5mm; }
  .title .kicker { font-size: 13pt; font-weight: 700; letter-spacing: .35em; color: #475569; }
  .title h2 { margin: 2mm 0 1.5mm; font-size: 30pt; font-weight: 800; line-height: 1.15; }
  .title .range { font-size: 12.5pt; color: #334155; }
  .rows { border-top: .5mm solid #0f172a; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 6mm; padding: 5.2mm 4mm; border-bottom: .3mm solid #94a3b8; }
  .row .label { font-size: 17pt; font-weight: 700; }
  .row .sub { display: block; margin-top: .8mm; font-size: 10pt; font-weight: 500; color: #64748b; }
  .row .amount { font-size: 31pt; font-weight: 800; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .row.in .amount { color: #047857; }
  .row.out .amount { color: #b91c1c; }
  .row.total { margin-top: 4mm; background: #1f3d6d; color: #fff; border: none; border-radius: 4mm; padding: 7mm 6mm; }
  .row.total .label { font-size: 19pt; }
  .row.total .sub { color: #cbd5e1; }
  .row.total .amount { font-size: 35pt; color: #fff; }
  .formula { margin: 4mm 0 0; text-align: center; font-size: 10pt; color: #64748b; }
  .notes.long { font-size: 9.5pt; line-height: 1.4; }
  .notes { margin-top: 5mm; padding: 4mm 5mm; border: .4mm solid #94a3b8; border-radius: 3mm; font-size: 11.5pt; line-height: 1.5; }
  .notes b { display: block; margin-bottom: 1mm; font-size: 10.5pt; letter-spacing: .04em; color: #475569; }
  .spacer { flex: 1; min-height: 8mm; }
  .foot { display: flex; gap: 8mm; align-items: flex-end; border-top: .5mm solid #0f172a; padding-top: 6mm; }
  .sign { flex: 1; display: flex; gap: 8mm; }
  .sign div { flex: 1; text-align: center; font-size: 11pt; }
  .sign .space { height: 18mm; }
  .sign .line { border-top: .3mm solid #0f172a; padding-top: 1.2mm; color: #475569; font-size: 9.5pt; }
  .qr { width: 34mm; text-align: center; font-size: 8.5pt; color: #334155; line-height: 1.3; }
  .qr svg { width: 34mm; height: 34mm; display: block; margin-bottom: 1.5mm; }
  .legal { margin-top: 5mm; text-align: center; font-size: 9pt; color: #64748b; }
  @media print {
    html, body { background: #fff; }
    .sheet { box-shadow: none; margin: 0; width: 100%; height: 296mm; min-height: 0; overflow: hidden; }
    .print-hide { display: none !important; }
  }
  @media screen and (max-width: 215mm) { .sheet { width: 100%; zoom: .6; } }
`;

export default async function PrintReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getPublishedReport(id);
  if (!report) notFound();
  const settings = await getSiteSettings();
  const url = `${publicEnv.siteUrl}/keuangan/${report.id}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0f172a", light: "#ffffff" } });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <PrintToolbar backHref={`/keuangan/${report.id}`} />
      <main id="konten" className="py-6 print:py-0">
        <article className="sheet" aria-label="Lembar laporan keuangan">
          <header className="head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-512.png" alt="" />
            <div>
              <h1>{settings.mosque_name.toUpperCase()}</h1>
              {settings.address && <p>{settings.address}</p>}
            </div>
          </header>
          <div className="rule" />

          <section className="title">
            <div className="kicker">LAPORAN KEUANGAN</div>
            <h2>{report.title.replace(/^Laporan\s+/i, "")}</h2>
            <div className="range">
              {formatDate(report.period_start, { weekday: true })} s.d. {formatDate(report.period_end, { weekday: true })}
            </div>
          </section>

          <section className="rows" aria-label="Ringkasan keuangan">
            <div className="row">
              <span className="label">Saldo Awal<span className="sub">Saldo di awal periode</span></span>
              <span className="amount">{formatRupiah(report.opening_balance)}</span>
            </div>
            <div className="row in">
              <span className="label">Pemasukan<span className="sub">Donasi, infaq, shodaqoh &amp; lainnya</span></span>
              <span className="amount">+ {formatRupiah(report.total_income)}</span>
            </div>
            <div className="row out">
              <span className="label">Pengeluaran<span className="sub">Operasional &amp; kegiatan masjid</span></span>
              <span className="amount">− {formatRupiah(report.total_expense)}</span>
            </div>
            <div className="row total">
              <span className="label">Saldo Akhir<span className="sub">Kas tunai + rekening bank</span></span>
              <span className="amount">{formatRupiah(report.closing_balance)}</span>
            </div>
          </section>
          <p className="formula">Saldo Awal + Pemasukan − Pengeluaran = Saldo Akhir</p>

          {report.notes && (
            <section className={`notes${report.notes.length > 350 ? " long" : ""}`}>
              <b>CATATAN PENGURUS</b>
              <span style={{ whiteSpace: "pre-line" }}>
                {report.notes.length > 800 ? `${report.notes.slice(0, 800).trimEnd()}… (selengkapnya di aplikasi)` : report.notes}
              </span>
            </section>
          )}

          <div className="spacer" />

          <footer className="foot">
            <div className="sign">
              <div>
                Bendahara
                <div className="space" />
                <div className="line">( ............................ )</div>
              </div>
              <div>
                Ketua Takmir
                <div className="space" />
                <div className="line">( ............................ )</div>
              </div>
            </div>
            <div className="qr">
              <span dangerouslySetInnerHTML={{ __html: qr }} />
              Pindai untuk membuka laporan di aplikasi
            </div>
          </footer>
          <p className="legal">
            Laporan ini telah diperiksa pengurus dan dipublikasikan pada {formatDate(report.published_at?.slice(0, 10) ?? report.period_end)}.
            Pertanyaan dapat disampaikan langsung kepada pengurus. · {publicEnv.siteUrl.replace(/^https?:\/\//, "")}
          </p>
        </article>
      </main>
    </>
  );
}
