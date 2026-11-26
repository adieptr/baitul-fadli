import { Banknote } from "lucide-react";

export function PaymentInfo({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="rounded-2xl border-2 border-gold-500 bg-gold-100/60 p-5">
      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <Banknote className="size-6 text-gold-700" aria-hidden /> Rekening / Cara Pembayaran
      </h3>
      <p className="mt-2 whitespace-pre-line text-lg text-slate-900">{text}</p>
    </div>
  );
}
