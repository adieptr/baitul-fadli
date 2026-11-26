"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

type Toast = { id: number; message: string };
const listeners = new Set<(t: Toast) => void>();
let seq = 0;

/** Tampilkan notifikasi sukses yang tetap terlihat walau form asalnya hilang dari layar. */
export function toast(message: string) {
  if (!message) return;
  const t = { id: ++seq, message };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const onToast = (t: Toast) => {
      setItems((x) => [...x.slice(-2), t]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), 7000);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4 text-lg text-emerald-900 shadow-xl"
        >
          <CheckCircle2 className="mt-0.5 size-6 shrink-0" aria-hidden />
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))}
            className="-m-1 rounded-lg p-1 hover:bg-emerald-100"
            aria-label="Tutup notifikasi"
          >
            <X className="size-5" />
          </button>
        </div>
      ))}
    </div>
  );
}
