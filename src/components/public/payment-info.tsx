import { Banknote } from "lucide-react";

export function PaymentInfo({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="rounded-2xl border border-slate-200 border-l-4 border-l-accent-500 bg-white p-6 text-slate-800 shadow-sm">
      <h3 className="flex items-center gap-2 font-bold text-slate-900">
        <Banknote className="size-5 text-accent-700" aria-hidden /> Rekening / Cara Pembayaran
      </h3>
      <p className="mt-2 whitespace-pre-line tabular-nums">{text}</p>
    </div>
  );
}
