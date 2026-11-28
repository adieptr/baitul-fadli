import { BadgeCheck, Undo2, XCircle } from "lucide-react";
import { ActionForm, ConfirmButton, MoneyField, SelectField, TextAreaField } from "@/components/ui/form";
import { setVoluntaryStatusAction } from "@/lib/actions/admin-donors";
import { ACCOUNTS } from "@/lib/accounts";
import { formatRupiah } from "@/lib/format";

type Donation = { id: string; status: string; amount: number | string; account_id: string; category_id: string };

export function VoluntaryActions({ donation, categories }: { donation: Donation; categories: Array<{ id: string; name: string }> }) {
  const hidden = (status: string) => (
    <>
      <input type="hidden" name="id" value={donation.id} />
      <input type="hidden" name="status" value={status} />
    </>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {donation.status !== "verified" && (
        <ActionForm action={setVoluntaryStatusAction}>
          {hidden("verified")}
          <ConfirmButton
            label={<><BadgeCheck className="size-4" aria-hidden /> Verifikasi</>}
            size="sm"
            title="Verifikasi donasi ini?"
            message={<p>Pastikan dana sudah masuk. Donasi akan otomatis dicatat sebagai pemasukan tanpa nama donatur. Nominal: <b>{formatRupiah(donation.amount)}</b>.</p>}
            confirmLabel="Ya, Dana Sudah Masuk"
          >
            <div className="space-y-4">
              <MoneyField label="Nominal yang diterima" name="amount" defaultValue={donation.amount} required />
              <SelectField
                label="Jenis"
                name="category_id"
                defaultValue={donation.category_id}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
              <fieldset>
                <legend className="mb-2 text-base font-semibold text-slate-800">Masuk ke</legend>
                <div className="grid grid-cols-2 gap-3">
                  {ACCOUNTS.map((a) => (
                    <label key={a.id} className="cursor-pointer">
                      <input type="radio" name="account" value={a.id} defaultChecked={donation.account_id === a.id} className="peer sr-only" />
                      <span className="flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white font-bold text-slate-600 peer-checked:border-brand-700 peer-checked:bg-brand-50 peer-checked:text-brand-800 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600">
                        {a.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <TextAreaField label="Catatan (opsional)" name="admin_note" rows={2} maxLength={300} defaultValue="" />
            </div>
          </ConfirmButton>
        </ActionForm>
      )}
      {donation.status === "awaiting_verification" && (
        <ActionForm action={setVoluntaryStatusAction}>
          {hidden("rejected")}
          <ConfirmButton
            label={<><XCircle className="size-4" aria-hidden /> Tolak</>}
            variant="secondary"
            size="sm"
            title="Tolak donasi ini?"
            message={<p>Dana belum ditemukan atau data tidak sesuai. Alasan akan terlihat oleh donatur.</p>}
            confirmLabel="Tolak"
          >
            <TextAreaField label="Alasan" name="admin_note" rows={2} maxLength={300} required defaultValue="" />
          </ConfirmButton>
        </ActionForm>
      )}
      {donation.status !== "awaiting_verification" && (
        <ActionForm action={setVoluntaryStatusAction}>
          {hidden("awaiting_verification")}
          <ConfirmButton
            label={<><Undo2 className="size-4" aria-hidden /> Kembalikan ke Menunggu</>}
            variant="ghost"
            size="sm"
            title="Kembalikan ke Menunggu Verifikasi?"
            message={<p>Transaksi pemasukan otomatis (jika ada) akan dihapus. Tindakan tercatat di log aktivitas.</p>}
            confirmLabel="Kembalikan"
          />
        </ActionForm>
      )}
    </div>
  );
}
