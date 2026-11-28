"use client";

import { useState } from "react";
import { ActionForm, SubmitButton, TextAreaField } from "@/components/ui/form";
import { submitVoluntaryDonationAction } from "@/lib/actions/donor";
import { ACCOUNTS } from "@/lib/accounts";
import { formatRupiah } from "@/lib/format";

const PRESETS = [50_000, 100_000, 200_000, 500_000];
const METHOD_LABEL: Record<string, [string, string]> = {
  bsi: ["Transfer Bank BSI", "Transfer ke rekening Bank BSI masjid"],
  cash: ["Tunai", "Diserahkan langsung kepada pengurus"],
};
const radioCard =
  "flex min-h-12 flex-col justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 peer-checked:border-brand-700 peer-checked:bg-brand-50 peer-checked:text-brand-800 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600";

export function VoluntaryDonationForm({ categories }: { categories: Array<{ id: string; name: string }> }) {
  const [preset, setPreset] = useState<number | "other">(100_000);
  const [raw, setRaw] = useState("");
  const typed = Number(raw.replace(/[^0-9]/g, "") || 0);
  const amount = preset === "other" ? typed : preset;

  return (
    <ActionForm action={submitVoluntaryDonationAction} className="space-y-6">
      <input type="hidden" name="amount" value={amount || ""} />

      <fieldset>
        <legend className="mb-2 text-base font-semibold text-slate-800">Jenis donasi *</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((c, i) => (
            <label key={c.id} className="cursor-pointer">
              <input type="radio" name="category_id" value={c.id} defaultChecked={i === 0} className="peer sr-only" required />
              <span className={radioCard}>{c.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-base font-semibold text-slate-800">Jumlah *</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {PRESETS.map((p) => (
            <label key={p} className="cursor-pointer">
              <input type="radio" name="_preset" checked={preset === p} onChange={() => setPreset(p)} className="peer sr-only" />
              <span className={`${radioCard} items-center text-center tabular-nums`}>{formatRupiah(p)}</span>
            </label>
          ))}
          <label className="cursor-pointer">
            <input type="radio" name="_preset" checked={preset === "other"} onChange={() => setPreset("other")} className="peer sr-only" />
            <span className={`${radioCard} items-center text-center`}>Jumlah lain</span>
          </label>
        </div>
        {preset === "other" && (
          <div className="relative mt-3">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-semibold text-slate-500">Rp</span>
            <input
              aria-label="Jumlah donasi"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="Contoh: 250.000"
              value={raw}
              onChange={(e) => {
                const d = e.target.value.replace(/[^0-9]/g, "");
                setRaw(d ? Number(d).toLocaleString("id-ID") : "");
              }}
              className="block min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-3 text-lg font-bold tabular-nums"
            />
            {typed > 0 && typed < 1000 && <p className="mt-2 text-red-700">Minimal Rp 1.000.</p>}
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-base font-semibold text-slate-800">Cara pembayaran *</legend>
        <div className="space-y-2">
          {ACCOUNTS.map((a) => (
            <label key={a.id} className="block cursor-pointer">
              <input type="radio" name="account" value={a.id} defaultChecked={a.id === "bsi"} className="peer sr-only" />
              <span className={radioCard}>
                {METHOD_LABEL[a.id][0]}
                <span className="text-sm font-normal text-slate-600">{METHOD_LABEL[a.id][1]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <TextAreaField label="Catatan (opsional)" name="note" rows={2} maxLength={300} placeholder="Contoh: Transfer a.n. Ahmad, tgl 10/11" />

      <SubmitButton size="lg" pendingText="Mengirim…" disabled={amount < 1000}>
        Kirim Donasi
      </SubmitButton>
    </ActionForm>
  );
}
