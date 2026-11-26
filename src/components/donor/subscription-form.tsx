"use client";

import { useState } from "react";
import { ActionForm, Field, MoneyField, SubmitButton, useFormCtx } from "@/components/ui/form";
import { saveSubscriptionAction } from "@/lib/actions/donor";
import { DAY_NAMES } from "@/lib/format";
import { cn } from "@/lib/cn";

type Sub = { amount: number; frequency: "weekly" | "monthly"; day_of_week: number | null; day_of_month: number | null } | null;

const QUICK = [20000, 50000, 100000, 250000, 500000];

function RadioCard({ name, value, checked, onChange, title, desc }: {
  name: string; value: string; checked: boolean; onChange: () => void; title: string; desc: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-4",
        checked ? "border-brand-700 bg-brand-50" : "border-slate-300 bg-white",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-1 size-5 accent-brand-700" />
      <span>
        <span className="block text-base font-bold">{title}</span>
        <span className="text-slate-600">{desc}</span>
      </span>
    </label>
  );
}

function AmountPicker({ initial }: { initial?: number }) {
  const [key, setKey] = useState(0);
  const [value, setValue] = useState<number | undefined>(initial);
  return (
    <div className="space-y-3">
      <MoneyField key={key} label="Nominal Donasi" name="amount" defaultValue={value} required hint="Minimal Rp1.000" />
      <div className="flex flex-wrap gap-2" aria-label="Pilihan cepat nominal">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setValue(q);
              setKey((k) => k + 1);
            }}
            className={cn(
              "min-h-10 rounded-full border px-4 font-semibold",
              value === q ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-800",
            )}
          >
            {q.toLocaleString("id-ID")}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScheduleFields({ initial }: { initial: Sub }) {
  const [freq, setFreq] = useState<"weekly" | "monthly">(initial?.frequency ?? "monthly");
  const { state } = useFormCtx();
  return (
    <>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-base font-semibold text-slate-800">Jadwal Donasi *</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <RadioCard name="frequency" value="monthly" checked={freq === "monthly"} onChange={() => setFreq("monthly")} title="Bulanan" desc="Satu kali setiap bulan" />
          <RadioCard name="frequency" value="weekly" checked={freq === "weekly"} onChange={() => setFreq("weekly")} title="Mingguan" desc="Satu kali setiap pekan" />
        </div>
        {state.fieldErrors?.frequency && <p className="text-sm font-medium text-red-700">{state.fieldErrors.frequency[0]}</p>}
      </fieldset>

      {freq === "weekly" ? (
        <Field label="Hari Pengingat" name="day_of_week" required hint="Pengingat dikirim pada hari ini setiap pekan.">
          {(a) => (
            <select {...a} name="day_of_week" defaultValue={initial?.day_of_week ?? 5} className="block min-h-10 w-full rounded-xl border border-slate-300 bg-white px-4 text-base">
              {DAY_NAMES.map((d, i) => (
                <option key={d} value={i + 1}>{d}</option>
              ))}
            </select>
          )}
        </Field>
      ) : (
        <Field label="Tanggal Pengingat" name="day_of_month" required hint="Pengingat dikirim pada tanggal ini setiap bulan (1–28).">
          {(a) => (
            <select {...a} name="day_of_month" defaultValue={initial?.day_of_month ?? 1} className="block min-h-10 w-full rounded-xl border border-slate-300 bg-white px-4 text-base">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>Tanggal {d}</option>
              ))}
            </select>
          )}
        </Field>
      )}
    </>
  );
}

export function SubscriptionForm({ initial }: { initial: Sub }) {
  return (
    <ActionForm action={saveSubscriptionAction} className="space-y-6">
      <AmountPicker initial={initial?.amount} />
      <ScheduleFields initial={initial} />
      <SubmitButton size="lg" className="w-full sm:w-auto" pendingText="Menyimpan…">
        {initial ? "Simpan Perubahan" : "Daftar Jadi Donatur Tetap"}
      </SubmitButton>
    </ActionForm>
  );
}
