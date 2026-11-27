import Link from "next/link";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { PasswordField } from "@/components/ui/password-field";
import { signInAction } from "@/lib/actions/auth";

export const metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; reset?: string }> }) {
  const { next, error, reset } = await searchParams;
  return (
    <>
      <h1 className="text-xl font-bold">Masuk</h1>
      <p className="mt-1 mb-6 text-slate-600">Masuk ke akun donatur atau akun pengurus.</p>
      {error === "link" && (
        <p role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          Tautan sudah tidak berlaku. Silakan masuk atau minta tautan baru.
        </p>
      )}
      {reset && (
        <p role="status" className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
          Kata sandi baru berhasil disimpan. Silakan masuk.
        </p>
      )}
      <ActionForm action={signInAction} className="space-y-5">
        <input type="hidden" name="next" value={next ?? ""} />
        <TextField
          label="Nomor HP"
          name="identifier"
          autoComplete="username"
          placeholder="08xxxxxxxxxx"
          hint="Nomor HP yang dipakai saat mendaftar. Pengurus juga bisa masuk dengan email."
          required
        />
        <PasswordField label="Kata Sandi" name="password" autoComplete="current-password" required />
        <SubmitButton size="lg" className="w-full" pendingText="Sedang masuk…">
          Masuk
        </SubmitButton>
      </ActionForm>
      <div className="mt-6 space-y-3 text-center text-base">
        <p>
          <Link href="/lupa-password" className="font-semibold text-brand-800 underline underline-offset-4">
            Lupa kata sandi?
          </Link>
        </p>
        <p>
          Belum punya akun?{" "}
          <Link href="/daftar" className="font-semibold text-brand-800 underline underline-offset-4">
            Daftar di sini
          </Link>
        </p>
      </div>
    </>
  );
}
