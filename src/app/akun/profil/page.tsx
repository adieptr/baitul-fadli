import { Card, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { PasswordField } from "@/components/ui/password-field";
import { TelegramConnect } from "@/components/donor/telegram-connect";
import { requireUser } from "@/lib/auth";
import { getDonorData } from "@/lib/queries/donor";
import { updateProfileAction } from "@/lib/actions/donor";
import { updatePasswordAction, signOutAction } from "@/lib/actions/auth";
import { SUBSCRIPTION_STATUS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { displayEmail } from "@/lib/synthetic-email";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser("/akun/profil");
  const { subscription, telegram } = await getDonorData(user.id);
  const membership = subscription ? SUBSCRIPTION_STATUS[subscription.status] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil Saya"
        action={
          <Badge tone={membership?.tone ?? "neutral"}>
            {membership ? `Donatur Tetap · ${membership.label}` : "Belum Terdaftar sebagai Donatur"}
          </Badge>
        }
      />

      <Card>
        <h2 className="mb-4 text-lg font-bold">Data Diri</h2>
        <ActionForm action={updateProfileAction} className="space-y-5">
          <TextField label="Nama Lengkap" name="full_name" defaultValue={user.fullName} autoComplete="name" required />
          <TextField
            label="Nomor HP (WhatsApp)"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={user.phone ?? ""}
            autoComplete="tel"
            required
          />
          {displayEmail(user.email) && (
            <TextField label="Email" name="email_display" value={user.email} disabled readOnly hint="Email tidak dapat diubah." />
          )}
          <SubmitButton>Simpan Profil</SubmitButton>
        </ActionForm>
      </Card>

      <Card>
        <h2 id="telegram" className="mb-4 scroll-mt-24 text-lg font-bold">
          Pengingat Telegram
        </h2>
        <TelegramConnect linked={Boolean(telegram)} username={telegram?.telegram_username} linkedAt={telegram?.linked_at} />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold">Ubah Kata Sandi</h2>
        <ActionForm action={updatePasswordAction} className="space-y-5" resetOnSuccess>
          <PasswordField label="Kata Sandi Baru" name="password" autoComplete="new-password" hint="Minimal 8 karakter." required />
          <PasswordField label="Ulangi Kata Sandi Baru" name="password_confirm" autoComplete="new-password" required />
          <SubmitButton variant="secondary">Ubah Kata Sandi</SubmitButton>
        </ActionForm>
      </Card>

      <form action={signOutAction}>
        <Button type="submit" variant="danger" size="lg" className="w-full sm:w-auto">
          Keluar dari Akun
        </Button>
      </form>
    </div>
  );
}
