"use client";

import { ArrowLeft, Printer } from "lucide-react";

/** Bilah alat di layar (tidak ikut tercetak). */
export function PrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="print-hide sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <a href={backHref} className="inline-flex min-h-10 items-center gap-2 font-semibold text-brand-800">
          <ArrowLeft className="size-4" aria-hidden /> Kembali
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 font-bold text-white hover:bg-brand-800"
        >
          <Printer className="size-5" aria-hidden /> Cetak / Simpan PDF
        </button>
      </div>
      <p className="mx-auto max-w-[210mm] px-4 pb-3 text-sm text-slate-600">
        Pilih kertas <b>A4</b>, orientasi <b>Potret</b>, skala <b>100%</b>. Untuk papan pengumuman, cetak berwarna lebih jelas, namun
        hitam-putih tetap terbaca.
      </p>
    </div>
  );
}
