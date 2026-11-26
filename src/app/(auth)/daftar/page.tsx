import Link from "next/link";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { PasswordField } from "@/components/ui/password-field";
import { signUpAction } from "@/lib/actions/auth";

export const metadata = { title: "Daftar Donatur" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-xl font-bold">Daftar Akun Donatur</h1>
      <p className="mt-1 mb-6 text-slate-600">Isi data berikut. Akun langsung aktif, lalu Anda dapat mengatur jadwal donasi rutin.</p>
      <ActionForm action={signUpAction} className="space-y-5" resetOnSuccess>
        <TextField label="Nama Lengkap" name="full_name" autoComplete="name" required />
        <TextField
          label="Nomor HP (WhatsApp)"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="08xxxxxxxxxx"
          required
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          hint="Tidak perlu konfirmasi email. Anda bisa masuk dengan nomor HP atau email."
          required
        />
        {/* Jebakan bot: tidak terlihat oleh manusia */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>
        <PasswordField label="Kata Sandi" name="password" autoComplete="new-password" hint="Minimal 8 karakter." required />
        <PasswordField label="Ulangi Kata Sandi" name="password_confirm" autoComplete="new-password" required />
        <p className="text-sm text-slate-600">
          Data pribadi Anda hanya digunakan oleh pengurus masjid untuk keperluan donasi dan tidak ditampilkan ke publik.
        </p>
        <SubmitButton size="lg" className="w-full" pendingText="Mendaftarkan…">
          Daftar
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-semibold text-brand-800 underline underline-offset-4">
          Masuk
        </Link>
      </p>
    </>
  );
}
