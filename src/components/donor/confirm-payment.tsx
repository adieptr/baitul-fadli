"use client";

import { ActionForm, ConfirmButton, TextAreaField } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { confirmPaymentAction } from "@/lib/actions/donor";
import { formatPeriodKey, formatRupiah } from "@/lib/format";

export function ConfirmPaymentForm({
  periodId,
  periodKey,
  amount,
  userId,
}: {
  periodId: string;
  periodKey: string;
  amount: number;
  userId: string;
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
          <FileUpload
            name="proof_path"
            label="Foto bukti transfer (opsional)"
            bucket="payment-proofs"
            folder={userId}
            hint="Foto akan diperkecil otomatis. Hanya pengurus yang dapat melihatnya."
          />
        </div>
      </ConfirmButton>
    </ActionForm>
  );
}
