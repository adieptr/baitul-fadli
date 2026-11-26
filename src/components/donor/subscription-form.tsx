"use client";

import { useState } from "react";
import { BellRing, CalendarDays, Info } from "lucide-react";
import { ActionForm, MoneyField, SubmitButton, useFormCtx } from "@/components/ui/form";
import { saveSubscriptionAction } from "@/lib/actions/donor";
import { DAY_NAMES, formatDate, formatRupiah } from "@/lib/format";
import { jakartaHour, jakartaToday, nextDueDate } from "@/lib/schedule";
import { cn } from "@/lib/cn";

type Freq = "weekly" | "monthly";
type Sub = { amount: number; frequency: Freq; day_of_week: number | null; day_of_month: number | null } | null;

const QUICK = [20000, 50000, 100000, 250000, 500000];
const DAY_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Ahad"];

function FieldError({ name }: { name: string }) {
  const { state } = useFormCtx();
  const msg = state.fieldErrors?.[name]?.[0];
  return msg ? <p className="mt-2 text-sm font-medium text-red-700">{msg}</p> : null;
}

/** Pilihan berbentuk tombol yang tetap memakai radio asli (aksesibel & ikut terkirim di form). */
function Choice({
  name,
  value,
  checked,
  onChange,
  children,
  className,
}: {
  name: string;
  value: string | number;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className="relative">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className={cn(
          "flex cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition-colors select-none",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500 peer-focus-visible:ring-offset-1",
          checked
            ? "border-brand-700 bg-brand-700 text-white shadow-sm"
            : "border-slate-200 bg-white text-slate-700 hover:border-brand-600 hover:bg-brand-50",
          className,
        )}
      >
        {children}
      </span>
    </label>
  );
}

export function SubscriptionForm({ initial }: { initial: Sub }) {
  const [amount, setAmount] = useState<number | undefined>(initial?.amount);
  const [amountKey, setAmountKey] = useState(0);
  const [freq, setFreq] = useState<Freq>(initial?.frequency ?? "monthly");
  const [dom, setDom] = useState<number>(initial?.day_of_month ?? 1);
  const [dow, setDow] = useState<number>(initial?.day_of_week ?? 5);

  const next = nextDueDate({
    frequency: freq,
    day_of_week: freq === "weekly" ? dow : null,
    day_of_month: freq === "monthly" ? dom : null,
  });
  const isToday = next === jakartaToday();
  const lateToday = isToday && jakartaHour() >= 7;
  const summary =
    freq === "monthly" ? `setiap tanggal ${dom} tiap bulan` : `setiap hari ${DAY_NAMES[dow - 1]}`;

  return (
    <ActionForm action={saveSubscriptionAction} className="space-y-8">
      {/* ---------- Nominal ---------- */}
      <section className="space-y-3">
        <MoneyField
          key={amountKey}
          label="Nominal Donasi"
          name="amount"
          defaultValue={amount}
          required
          hint="Minimal Rp1.000. Ketik sendiri atau pilih cepat di bawah."
          onInput={(e) => {
            const n = Number(e.currentTarget.value.replace(/[^0-9]/g, ""));
            setAmount(n || undefined);
          }}
        />
        <div className="flex flex-wrap gap-2" aria-label="Pilihan cepat nominal">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setAmount(q);
                setAmountKey((k) => k + 1);
              }}
              className={cn(
                "min-h-9 rounded-full border px-4 text-sm font-semibold transition-colors",
                amount === q
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-600 hover:bg-brand-50",
              )}
            >
              {q.toLocaleString("id-ID")}
            </button>
          ))}
        </div>
      </section>

      {/* ---------- Jadwal ---------- */}
      <fieldset className="space-y-3">
        <legend className="mb-2 block text-sm font-semibold text-slate-800">
          Jadwal Donasi <span className="text-red-700">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="presentation">
          {(
            [
              ["monthly", "Bulanan", "1× sebulan"],
              ["weekly", "Mingguan", "1× sepekan"],
            ] as const
          ).map(([v, label, sub]) => (
            <label key={v} className="relative">
              <input
                type="radio"
                name="frequency"
                value={v}
                checked={freq === v}
                onChange={() => setFreq(v)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex cursor-pointer flex-col items-center rounded-lg px-3 py-2 transition-all select-none",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500",
                  freq === v ? "bg-white text-brand-800 shadow-sm" : "text-slate-600 hover:text-slate-900",
                )}
              >
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs opacity-75">{sub}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError name="frequency" />
      </fieldset>

      {/* ---------- Tanggal / hari pengingat ---------- */}
      {freq === "monthly" ? (
        <fieldset>
          <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CalendarDays className="size-4 text-brand-700" aria-hidden /> Tanggal Pengingat
          </legend>
          <p className="mb-3 text-sm text-slate-600">Pilih tanggal pengingat dikirim setiap bulan.</p>
          <div className="grid max-w-sm grid-cols-7 gap-1.5">
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <Choice
                key={d}
                name="day_of_month"
                value={d}
                checked={dom === d}
                onChange={() => setDom(d)}
                className="aspect-square tabular-nums"
              >
                {d}
              </Choice>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            Tanggal 29–31 tidak tersedia agar pengingat tetap terkirim setiap bulan, termasuk Februari.
          </p>
          <FieldError name="day_of_month" />
        </fieldset>
      ) : (
        <fieldset>
          <legend className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CalendarDays className="size-4 text-brand-700" aria-hidden /> Hari Pengingat
          </legend>
          <p className="mb-3 text-sm text-slate-600">Pilih hari pengingat dikirim setiap pekan.</p>
          <div className="grid max-w-sm grid-cols-7 gap-1.5">
            {DAY_SHORT.map((d, i) => (
              <Choice
                key={d}
                name="day_of_week"
                value={i + 1}
                checked={dow === i + 1}
                onChange={() => setDow(i + 1)}
                className="h-11 text-xs sm:text-sm"
              >
                <span aria-hidden>{d}</span>
                <span className="sr-only">{DAY_NAMES[i]}</span>
              </Choice>
            ))}
          </div>
          <FieldError name="day_of_week" />
        </fieldset>
      )}

      {/* ---------- Pratinjau ---------- */}
      <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4" aria-live="polite">
        <BellRing className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
        <div className="text-sm text-slate-700">
          <p>
            {amount ? <b className="text-slate-900">{formatRupiah(amount)}</b> : "Donasi"} {summary}.
          </p>
          <p className="mt-0.5">
            Jatuh tempo berikutnya:{" "}
            <b className="text-brand-800">{isToday ? "hari ini, " : ""}{formatDate(next, { weekday: true })}</b>.
          </p>
          <p className="mt-0.5 text-slate-600">
            {lateToday
              ? "Karena pengingat harian sudah terkirim pukul 07.00 WIB, pengingat untuk tagihan ini dikirim besok pagi via Telegram."
              : "Pengingat dikirim via Telegram pada pagi hari tersebut (±07.00 WIB)."}
          </p>
        </div>
      </div>

      <SubmitButton size="lg" className="w-full sm:w-auto" pendingText="Menyimpan…">
        {initial ? "Simpan Perubahan" : "Daftar Jadi Donatur Tetap"}
      </SubmitButton>
    </ActionForm>
  );
}
