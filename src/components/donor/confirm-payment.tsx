"use client";

import { ActionForm, ConfirmButton, TextAreaField } from "@/components/ui/form";
import { confirmPaymentAction } from "@/lib/actions/donor";
import { formatPeriodKey, formatRupiah } from "@/lib/format";

export function ConfirmPaymentForm({
  periodId,
  periodKey,
  amount,
}: {
  periodId: string;
  periodKey: string;
  amount: number;
}) {
  return (
    <ActionForm action={confirmPaymentAction}>
      <input type="hidden" name="period_id" value={periodId} />
      <ConfirmButton
        label="Saya Sudah Bayar"
        size="lg"
        className="w-full sm:w-auto"
        title="Konfirmasi Pembayaran"
        message={
          <p>
            Anda mengonfirmasi telah mentransfer <b>{formatRupiah(amount)}</b> untuk periode <b>{formatPeriodKey(periodKey)}</b>.
            Pengurus akan memeriksa dan memverifikasi pembayaran Anda.
          </p>
        }
        confirmLabel="Kirim Konfirmasi"
      >
        <div className="space-y-4">
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
