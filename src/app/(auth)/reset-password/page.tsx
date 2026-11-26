import { redirect } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { PasswordField } from "@/components/ui/password-field";
import { resetPasswordWithTokenAction, updatePasswordAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Atur Kata Sandi Baru", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  // Mode 1: tautan dari Telegram (tanpa login)
  if (token) {
    return (
      <>
        <h1 className="text-xl font-bold">Buat Kata Sandi Baru</h1>
        <p className="mt-1 mb-6 text-slate-600">Masukkan kata sandi baru Anda, lalu masuk kembali.</p>
        <ActionForm action={resetPasswordWithTokenAction} className="space-y-5">
          <input type="hidden" name="token" value={token} />
          <PasswordField label="Kata Sandi Baru" name="password" autoComplete="new-password" hint="Minimal 8 karakter." required />
          <PasswordField label="Ulangi Kata Sandi Baru" name="password_confirm" autoComplete="new-password" required />
          <SubmitButton size="lg" className="w-full">
            Simpan Kata Sandi
          </SubmitButton>
        </ActionForm>
        <LinkButton href="/lupa-password" variant="ghost" className="mt-4 w-full">
          Minta tautan baru
        </LinkButton>
      </>
    );
  }

  // Mode 2: sudah login
  const user = await getCurrentUser();
  if (!user) redirect("/lupa-password");
  return (
    <>
      <h1 className="text-xl font-bold">Atur Kata Sandi Baru</h1>
      <p className="mt-1 mb-6 text-slate-600">Untuk akun {user.email}</p>
      <ActionForm action={updatePasswordAction} className="space-y-5" resetOnSuccess>
        <PasswordField label="Kata Sandi Baru" name="password" autoComplete="new-password" hint="Minimal 8 karakter." required />
        <PasswordField label="Ulangi Kata Sandi Baru" name="password_confirm" autoComplete="new-password" required />
        <SubmitButton size="lg" className="w-full">
          Simpan Kata Sandi
        </SubmitButton>
      </ActionForm>
      <LinkButton href="/akun" variant="ghost" className="mt-4 w-full">
        Ke Halaman Akun
      </LinkButton>
    </>
  );
}
