import { BadgeCheck, Send, Undo2, XCircle } from "lucide-react";
import { ActionForm, CheckboxField, ConfirmButton, TextAreaField } from "@/components/ui/form";
import { sendReminderAction, setPeriodStatusAction } from "@/lib/actions/admin-donors";
import { formatPeriodKey, formatRupiah, type PeriodStatus } from "@/lib/format";

export function PeriodActions({
  period,
  donorName,
  hasTelegram,
}: {
  period: { id: string; status: PeriodStatus; amount: number | string; period_key: string };
  donorName: string;
  hasTelegram: boolean;
}) {
  const desc = (
    <>
      <b>{donorName}</b> · {formatPeriodKey(period.period_key)} · <b>{formatRupiah(period.amount)}</b>
    </>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {period.status !== "paid" && (
        <ActionForm action={setPeriodStatusAction}>
          <input type="hidden" name="period_id" value={period.id} />
          <input type="hidden" name="status" value="paid" />
          <ConfirmButton
            label={
              <>
                <BadgeCheck className="size-4" aria-hidden /> Verifikasi Lunas
              </>
            }
            size="sm"
            title="Verifikasi pembayaran?"
            message={<p>Pastikan dana sudah masuk ke rekening masjid. {desc}</p>}
            confirmLabel="Ya, Sudah Dibayar"
          >
            <div className="space-y-4">
              <CheckboxField
                name="record_income"
                defaultChecked
                label="Catat otomatis sebagai pemasukan"
                hint='Membuat transaksi kategori "Donatur Tetap" tanggal hari ini (tanpa nama donatur).'
              />
              <TextAreaField label="Catatan (opsional)" name="admin_note" rows={2} maxLength={300} />
            </div>
          </ConfirmButton>
        </ActionForm>
      )}
      {period.status === "awaiting_verification" && (
        <ActionForm action={setPeriodStatusAction}>
          <input type="hidden" name="period_id" value={period.id} />
          <input type="hidden" name="status" value="pending" />
          <ConfirmButton
            label={
              <>
                <XCircle className="size-4" aria-hidden /> Tolak
              </>
            }
            variant="secondary"
            size="sm"
            title="Tolak konfirmasi pembayaran?"
            message={<p>Dana belum ditemukan di rekening. Status kembali menjadi &quot;Menunggu Pembayaran&quot;. {desc}</p>}
            confirmLabel="Tolak Konfirmasi"
          >
            <TextAreaField label="Alasan (akan terlihat oleh donatur)" name="admin_note" rows={2} maxLength={300} />
          </ConfirmButton>
        </ActionForm>
      )}
      {period.status === "paid" && (
        <ActionForm action={setPeriodStatusAction}>
          <input type="hidden" name="period_id" value={period.id} />
          <input type="hidden" name="status" value="unpaid" />
          <ConfirmButton
            label={
              <>
                <Undo2 className="size-4" aria-hidden /> Batalkan Lunas
              </>
            }
            variant="ghost"
            size="sm"
            title="Batalkan status lunas?"
            message={<p>Status menjadi &quot;Belum Dibayar&quot; dan transaksi pemasukan otomatis (jika ada) akan dihapus. {desc}</p>}
            confirmLabel="Batalkan Lunas"
          >
            <TextAreaField label="Alasan" name="admin_note" rows={2} maxLength={300} required />
          </ConfirmButton>
        </ActionForm>
      )}
      {(period.status === "pending" || period.status === "unpaid") && hasTelegram && (
        <ActionForm action={sendReminderAction}>
          <input type="hidden" name="period_id" value={period.id} />
          <ConfirmButton
            label={
              <>
                <Send className="size-4" aria-hidden /> Kirim Pengingat
              </>
            }
            variant="ghost"
            size="sm"
            title="Kirim pengingat via Telegram?"
            message={<p>Pesan pengingat akan dikirim ke Telegram donatur. {desc}</p>}
            confirmLabel="Kirim"
          />
        </ActionForm>
      )}
    </div>
  );
}
