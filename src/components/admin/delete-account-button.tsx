import { ActionForm, ConfirmButton, TextAreaField } from "@/components/ui/form";
import { adminDeleteAccountAction } from "@/lib/actions/admin-donors";

export function DeleteAccountButton({ userId, name, from }: { userId: string; name: string | null; from: "donatur" | "pengguna" }) {
  return (
    <ActionForm action={adminDeleteAccountAction}>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="from" value={from} />
      <ConfirmButton
        label="Hapus Akun"
        variant="danger"
        size="sm"
        title={`Hapus akun ${name || "pengguna ini"}?`}
        message={
          <>
            Profil, nomor HP, jadwal donasi, tagihan, tautan Telegram, dan foto bukti transfer akan <b>dihapus permanen</b>.
            Catatan pemasukan kas masjid tetap tersimpan tanpa nama. Tindakan ini tidak dapat dibatalkan.
          </>
        }
        confirmLabel="Ya, Hapus Akun"
      >
        <TextAreaField label="Alasan" name="reason" rows={2} required defaultValue="" placeholder="Contoh: permintaan donatur / akun ganda / akun uji coba" />
      </ConfirmButton>
    </ActionForm>
  );
}
