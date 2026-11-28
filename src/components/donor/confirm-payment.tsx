"use client";

import { useState } from "react";
import { ActionForm, ConfirmButton, TextAreaField } from "@/components/ui/form";
import { confirmPaymentAction } from "@/lib/actions/donor";
import { ACCOUNTS } from "@/lib/accounts";
import { cn } from "@/lib/cn";
import { formatPeriodKey, formatRupiah } from "@/lib/format";

const CHOICES = [
  { id: "same", label: "Sesuai tagihan" },
  { id: "other", label: "Jumlah lain" },
] as const;

const METHOD_HINT: Record<string, string> = {
  bsi: "Transfer ke rekening Bank BSI masjid",
  cash: "Diserahkan langsung kepada pengurus",
};

export function ConfirmPaymentForm({ periodId, periodKey, amount }: { periodId: string; periodKey: string; amount: number }) {
  const [mode, setMode] = useState<"same" | "other">("same");
  const [raw, setRaw] = useState("");
  const typed = Number(raw.replace(/[^0-9]/g, "") || 0);
  const paid = mode === "same" ? amount : typed;
  const diff = paid - amount;
  const invalid = mode === "other" && (typed < 1000 || typed > 1_000_000_000);

  return (
    <ActionForm action={confirmPaymentAction}>
      <input type="hidden" name="period_id" value={periodId} />
      <input type="hidden" name="amount" value={paid || ""} />
      <ConfirmButton
        label="Saya Sudah Bayar"
        size="lg"
        className="w-full sm:w-auto"
        title="Konfirmasi Pembayaran"
        submitDisabled={invalid}
        message={
          <p>
            Tagihan periode <b>{formatPeriodKey(periodKey)}</b>: <b>{formatRupiah(amount)}</b>. Silakan isi jumlah yang
            sebenarnya Anda berikan. Pengurus akan memeriksa dan memverifikasinya.
          </p>
        }
        confirmLabel="Kirim Konfirmasi"
      >
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-base font-semibold text-slate-800">Jumlah yang Anda berikan</legend>
            <div className="grid grid-cols-2 gap-3">
              {CHOICES.map((c) => (
                <label key={c.id} className="cursor-pointer">
                  <input type="radio" name="_amount_mode" checked={mode === c.id} onChange={() => setMode(c.id)} className="peer sr-only" />
                  <span className="flex min-h-12 flex-col items-center justify-center rounded-xl border border-slate-300 bg-white px-2 text-center font-bold text-slate-600 peer-checked:border-brand-700 peer-checked:bg-brand-50 peer-checked:text-brand-800 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600">
                    {c.label}
                    {c.id === "same" && <span className="text-sm font-semibold tabular-nums">{formatRupiah(amount)}</span>}
                  </span>
                </label>
              ))}
            </div>
            {mode === "other" && (
              <div className="mt-3">
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-semibold text-slate-500">Rp</span>
                  <input
                    aria-label="Jumlah donasi"
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus
                    placeholder="Contoh: 150.000"
                    value={raw}
                    onChange={(e) => {
                      const d = e.target.value.replace(/[^0-9]/g, "");
                      setRaw(d ? Number(d).toLocaleString("id-ID") : "");
                    }}
                    className="block min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-3 text-lg font-bold tabular-nums"
                  />
                </div>
                {typed > 0 && typed < 1000 && <p className="mt-2 text-red-700">Minimal Rp 1.000.</p>}
                {typed >= 1000 && diff > 0 && (
                  <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-emerald-900">
                    Lebih <b>{formatRupiah(diff)}</b> dari tagihan. Jazakumullahu khairan — seluruh jumlah dicatat sebagai donasi Anda.
                  </p>
                )}
                {typed >= 1000 && diff < 0 && (
                  <p className="mt-2 rounded-xl bg-amber-50 p-3 text-amber-900">
                    Kurang <b>{formatRupiah(-diff)}</b> dari tagihan. Tidak apa-apa — pengurus mencatat sesuai jumlah yang Anda berikan.
                  </p>
                )}
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-base font-semibold text-slate-800">Cara pembayaran</legend>
            <div className="space-y-2">
              {ACCOUNTS.map((a, i) => (
                <label key={a.id} className="block cursor-pointer">
                  <input type="radio" name="account" value={a.id} defaultChecked={i === 1} className="peer sr-only" />
                  <span className="flex min-h-12 flex-col justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 peer-checked:border-brand-700 peer-checked:bg-brand-50 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600">
                    <span className={cn("font-bold")}>{a.id === "bsi" ? "Transfer Bank BSI" : "Tunai"}</span>
                    <span className="text-sm text-slate-600">{METHOD_HINT[a.id]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <TextAreaField
            label="Catatan (opsional)"
            name="note"
            rows={2}
            maxLength={300}
            placeholder="Contoh: Transfer dari BSI a.n. Ahmad, tgl 10/11"
          />
        </div>
      </ConfirmButton>
    </ActionForm>
  );
}
