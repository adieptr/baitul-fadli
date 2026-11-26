"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { ActionForm, ConfirmButton } from "@/components/ui/form";
import { createTelegramLinkAction, unlinkTelegramAction } from "@/lib/actions/donor";
import { formatDateTime } from "@/lib/format";

export function TelegramConnect({
  linked,
  username,
  linkedAt,
}: {
  linked: boolean;
  username?: string | null;
  linkedAt?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  // Setelah tautan dibuat, periksa status berkala (maks. 3 menit).
  useEffect(() => {
    if (!url || linked) return;
    const startedAt = Date.now();
    const t = setInterval(() => {
      if (Date.now() - startedAt > 180_000) return clearInterval(t);
      router.refresh();
    }, 4000);
    return () => clearInterval(t);
  }, [url, linked, router]);

  if (linked) {
    return (
      <div className="space-y-4">
        <p className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0" aria-hidden />
          <span>
            <b>Telegram sudah terhubung</b>
            {username ? ` (@${username})` : ""}. Pengingat donasi akan dikirim otomatis.
            {linkedAt && <span className="block text-sm">Sejak {formatDateTime(linkedAt)}</span>}
          </span>
        </p>
        <ActionForm action={unlinkTelegramAction}>
          <ConfirmButton
            label="Putuskan Telegram"
            variant="secondary"
            size="sm"
            title="Putuskan tautan Telegram?"
            message="Anda tidak akan menerima pengingat donasi lagi sampai menghubungkan ulang."
            confirmLabel="Ya, Putuskan"
          />
        </ActionForm>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-700">
        Hubungkan akun Telegram agar Anda menerima <b>pengingat donasi otomatis</b> sesuai jadwal, dan dapat{" "}
        <b>memulihkan kata sandi</b> sendiri bila lupa. Pastikan aplikasi Telegram sudah terpasang di HP Anda.
      </p>
      {!url ? (
        <Button
          size="lg"
          className="w-full bg-[#229ED9] hover:bg-[#1c86b9] sm:w-auto"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await createTelegramLinkAction();
              if (r.ok && r.url) setUrl(r.url);
              else setError(r.message);
            })
          }
        >
          {pending ? <Loader2 className="size-6 animate-spin" /> : <Send className="size-6" />} Hubungkan ke Telegram
        </Button>
      ) : (
        <div className="space-y-3 rounded-2xl border-2 border-[#229ED9] bg-sky-50 p-4">
          <ol className="list-decimal space-y-1 pl-6 text-lg">
            <li>Tekan tombol <b>Buka Telegram</b> di bawah.</li>
            <li>
              Di Telegram, tekan <b>MULAI / START</b>.
            </li>
            <li>Kembali ke halaman ini. Status akan diperbarui otomatis.</li>
          </ol>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("primary", "lg", "w-full bg-[#229ED9] hover:bg-[#1c86b9]")}
          >
            <Send className="size-6" aria-hidden /> Buka Telegram
          </a>
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Menunggu konfirmasi dari Telegram… (tautan berlaku 15 menit)
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
