import Link from "next/link";
import { Send } from "lucide-react";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { forgotPasswordAction } from "@/lib/actions/auth";

export const metadata = { title: "Lupa Kata Sandi" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-bold">Lupa Kata Sandi</h1>
      <p className="mt-1 mb-4 text-slate-600">
        Masukkan nomor HP atau email akun Anda. Tautan untuk membuat kata sandi baru akan dikirim melalui{" "}
        <b>Telegram</b> yang sudah terhubung dengan akun.
      </p>
      <ActionForm action={forgotPasswordAction} className="space-y-5" resetOnSuccess>
        <TextField label="Nomor HP atau Email" name="identifier" autoComplete="username" placeholder="08xxxxxxxxxx" required />
        <SubmitButton size="lg" className="w-full" pendingText="Mengirim…">
          <Send className="size-4" aria-hidden /> Kirim Tautan ke Telegram
        </SubmitButton>
      </ActionForm>
      <div className="mt-6 rounded-xl bg-slate-50 p-4 text-base text-slate-700">
        <b>Belum menghubungkan Telegram?</b> Hubungi pengurus masjid. Pengurus dapat membuatkan kata sandi sementara
        untuk Anda.
      </div>
      <p className="mt-6 text-center">
        <Link href="/masuk" className="font-semibold text-brand-800 underline underline-offset-4">
          Kembali ke halaman masuk
        </Link>
      </p>
    </>
  );
}
