"use client";

import { useRef, useState, useTransition } from "react";
import { Copy, KeyRound, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminResetPasswordAction } from "@/lib/actions/admin-donors";

export function ResetPasswordButton({ userId, name, phone }: { userId: string; name: string; phone?: string | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string; tempPassword?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const wa = (phone ?? "").replace(/[^0-9]/g, "").replace(/^0/, "62");
  const waText = result?.tempPassword
    ? encodeURIComponent(
        `Assalamu'alaikum ${name}. Kata sandi sementara akun website Masjid Baitul Fadli Anda: ${result.tempPassword}\nMasuk dengan nomor HP Anda, lalu segera ganti kata sandi di menu Profil.`,
      )
    : "";

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setResult(null);
          setCopied(false);
          ref.current?.showModal();
        }}
      >
        <KeyRound className="size-4" aria-hidden /> Reset Kata Sandi
      </Button>
      <dialog ref={ref} className="m-auto w-[min(92vw,32rem)] rounded-xl p-0 shadow-2xl">
        <div className="space-y-4 p-6">
          <h2 className="text-lg font-bold">Reset kata sandi {name}?</h2>
          {!result?.tempPassword ? (
            <>
              <p className="text-slate-700">
                Sistem membuat <b>kata sandi sementara</b> yang hanya ditampilkan sekali. Sampaikan langsung kepada yang
                bersangkutan (bertemu langsung atau WhatsApp pribadi). Kata sandi lama tidak berlaku lagi.
              </p>
              {result && !result.ok && <p role="alert" className="font-medium text-red-700">{result.message}</p>}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => ref.current?.close()}>Batal</Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={pending}
                  onClick={() => start(async () => setResult(await adminResetPasswordAction(userId)))}
                >
                  {pending && <Loader2 className="size-4 animate-spin" />} Buat Kata Sandi Sementara
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-slate-700">Kata sandi sementara:</p>
              <p className="rounded-xl border border-brand-700 bg-brand-50 p-4 text-center font-mono text-xl font-bold tracking-wide select-all" data-temp-password>
                {result.tempPassword}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(result.tempPassword!).catch(() => {});
                    setCopied(true);
                  }}
                >
                  <Copy className="size-4" aria-hidden /> {copied ? "Tersalin" : "Salin"}
                </Button>
                {wa && (
                  <a
                    href={`https://wa.me/${wa}?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#1f7a4d] px-5 font-semibold text-white"
                  >
                    <MessageCircle className="size-4" aria-hidden /> Kirim via WhatsApp
                  </a>
                )}
              </div>
              <Button type="button" className="w-full" onClick={() => ref.current?.close()}>Selesai</Button>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
