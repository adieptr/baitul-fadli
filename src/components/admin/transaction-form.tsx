"use client";

import { useState } from "react";
import { ActionForm, MoneyField, SelectField, SubmitButton, TextField, TextAreaField } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { saveTransactionAction } from "@/lib/actions/admin-finance";
import { cn } from "@/lib/cn";

type Category = { id: string; name: string; type: "income" | "expense"; is_active: boolean };
type Tx = {
  id: string;
  type: "income" | "expense";
  category_id: string;
  amount: number;
  transaction_date: string;
  description: string;
  proof_path: string | null;
};

export function TransactionForm({
  categories,
  initial,
  today,
  proofUrl,
  locked,
}: {
  categories: Category[];
  initial?: Tx;
  today: string;
  proofUrl?: string | null;
  locked?: boolean;
}) {
  const [type, setType] = useState<"income" | "expense">(initial?.type ?? "income");
  const options = categories
    .filter((c) => c.type === type && (c.is_active || c.id === initial?.category_id))
    .map((c) => ({ value: c.id, label: c.name }));

  return (
    <ActionForm action={saveTransactionAction} className="space-y-5" resetOnSuccess={!initial}>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <fieldset disabled={locked} className="space-y-5">
        <div>
          <span className="mb-2 block text-base font-semibold text-slate-800">Jenis Transaksi *</span>
          <div className="grid grid-cols-2 gap-3">
            {(["income", "expense"] as const).map((t) => (
              <label
                key={t}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 text-lg font-bold",
                  type === t
                    ? t === "income"
                      ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                      : "border-red-700 bg-red-50 text-red-800"
                    : "border-slate-300 bg-white text-slate-600",
                )}
              >
                <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
                {t === "income" ? "Pemasukan" : "Pengeluaran"}
              </label>
            ))}
          </div>
        </div>
        <SelectField
          key={type}
          label="Kategori"
          name="category_id"
          options={options}
          placeholder="— Pilih kategori —"
          defaultValue={initial?.type === type ? initial.category_id : ""}
          required
        />
        <MoneyField label="Nominal" name="amount" defaultValue={initial?.amount} required />
        <TextField label="Tanggal" name="transaction_date" type="date" defaultValue={initial?.transaction_date ?? today} max="2100-12-31" required />
        <TextAreaField
          label="Keterangan"
          name="description"
          rows={3}
          defaultValue={initial?.description}
          maxLength={500}
          required
          hint="Keterangan akan tampil di laporan publik. Jangan cantumkan data pribadi donatur tanpa izin."
        />
        <FileUpload
          name="proof_path"
          label="Bukti Transaksi (opsional)"
          bucket="transaction-proofs"
          folder={`tx/${today.slice(0, 7)}`}
          defaultPath={initial?.proof_path}
          previewUrl={initial?.proof_path?.endsWith(".pdf") ? null : proofUrl}
          allowPdf
          hint="Foto nota/kuitansi atau PDF. Hanya dapat dilihat admin."
        />
      </fieldset>
      {!locked && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <SubmitButton size="lg" pendingText="Menyimpan…">
            Simpan
          </SubmitButton>
          {!initial && (
            <SubmitButton size="lg" variant="secondary" name="_after" value="new">
              Simpan &amp; Tambah Lagi
            </SubmitButton>
          )}
        </div>
      )}
    </ActionForm>
  );
}
