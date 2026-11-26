import { Banknote } from "lucide-react";

export function PaymentInfo({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="rounded-xl border border-gold-500 bg-gold-100/60 p-5">
      <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <Banknote className="size-5 text-gold-700" aria-hidden /> Rekening / Cara Pembayaran
      </h3>
      <p className="mt-2 whitespace-pre-line text-base text-slate-900">{text}</p>
    </div>
  );
}
