"use client";

import { useEffect, useRef } from "react";
import { Info, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const SEEN_KEY = "bf-intro-seen";
const OPEN_EVENT = "bf-open-info";

export type MosqueInfo = {
  name: string;
  tagline: string;
  summary: string;
  address: string;
  photo: string | null;
};

/** Popup info masjid: tampil otomatis sekali per sesi saat aplikasi dibuka, bisa dibuka lagi lewat tombol ⓘ. */
export function MosqueInfoDialog({ info }: { info: MosqueInfo }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const open = () => ref.current?.showModal();
    window.addEventListener(OPEN_EVENT, open);
    try {
      if (!sessionStorage.getItem(SEEN_KEY)) {
        sessionStorage.setItem(SEEN_KEY, "1");
        open();
      }
    } catch {
      // penyimpanan diblokir: jangan paksa popup
    }
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="info-masjid-judul"
      className="m-auto w-[min(92vw,26rem)] overflow-hidden rounded-3xl p-0 shadow-2xl"
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close(); // klik di luar kartu menutup popup
      }}
    >
      <div className="relative h-52 overflow-hidden bg-gradient-to-b from-[#cfe0f4] via-brand-50 to-white">
        <div className="lattice absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" aria-hidden />
        {info.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={info.photo} alt={`Foto ${info.name}`} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/images/masjid-baitul-fadli.webp"
          alt={`Bangunan ${info.name}`}
          className="absolute bottom-0 left-1/2 h-[92%] w-auto max-w-none -translate-x-1/2 drop-shadow-[0_12px_18px_rgba(15,33,64,0.25)]"
        />
        )}
        <form method="dialog">
          <button
            className="absolute top-3 right-3 rounded-full bg-white/80 p-1.5 text-slate-700 shadow hover:bg-white"
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
        </form>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <h2 id="info-masjid-judul" className="text-xl font-extrabold text-slate-900">
            {info.name}
          </h2>
          {info.tagline && <p className="text-sm text-slate-600">{info.tagline}</p>}
        </div>
        {info.summary && <p className="text-sm leading-relaxed text-slate-700">{info.summary}</p>}
        {info.address && (
          <p className="flex gap-2 text-sm text-slate-700">
            <MapPin className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden /> {info.address}
          </p>
        )}
        <form method="dialog" className="pt-1">
          <Button type="submit" className="w-full">
            Lanjutkan
          </Button>
        </form>
      </div>
    </dialog>
  );
}

export function MosqueInfoButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="inline-flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
      aria-label="Info masjid"
      title="Info masjid"
    >
      <Info className="size-5" />
    </button>
  );
}
