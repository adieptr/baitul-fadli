"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "bf-install-dismissed";

function subscribe() {
  return () => {};
}
function getPlatform() {
  const ua = navigator.userAgent;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ios = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
  let dismissed = false;
  try {
    dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now() - 14 * 86400_000;
  } catch {}
  return `${standalone ? 1 : 0}${ios ? 1 : 0}${dismissed ? 1 : 0}`;
}

/** Ajakan memasang aplikasi ke layar utama (Android/desktop: tombol; iOS: petunjuk). */
export function InstallPrompt({ variant = "banner" }: { variant?: "banner" | "inline" }) {
  const platform = useSyncExternalStore(subscribe, getPlatform, () => "100");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const standalone = platform[0] === "1";
  const ios = platform[1] === "1";
  const dismissed = platform[2] === "1";

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (standalone || hidden) return null;
  if (variant === "banner" && dismissed) return null;
  if (!deferred && !ios) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setHidden(true);
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      setDeferred(null);
      setHidden(true);
    } else {
      setShowIosHelp((v) => !v);
    }
  };

  const content = (
    <>
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="size-10 rounded-xl" />
        <div className="flex-1">
          <p className="font-bold text-slate-900">Pasang aplikasi Baitul Fadli</p>
          <p className="text-sm text-slate-600">Buka lebih cepat langsung dari layar utama HP Anda.</p>
        </div>
        {variant === "banner" && (
          <button onClick={dismiss} aria-label="Tutup" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        )}
      </div>
      <Button onClick={install} className="mt-3 w-full" size="md">
        <Download className="size-4" /> {ios ? "Cara Memasang" : "Pasang Sekarang"}
      </Button>
      {showIosHelp && (
        <ol className="mt-3 space-y-2 rounded-xl bg-slate-50 p-4 text-base text-slate-700">
          <li className="flex items-center gap-2">
            1. Buka website ini di <b>Safari</b>.
          </li>
          <li className="flex items-center gap-2">
            2. Ketuk tombol <Share className="inline size-4" aria-label="Bagikan" /> <b>Bagikan</b> di bawah layar.
          </li>
          <li className="flex items-center gap-2">
            3. Pilih <SquarePlus className="inline size-4" aria-hidden /> <b>Tambah ke Layar Utama</b>.
          </li>
        </ol>
      )}
    </>
  );

  if (variant === "inline") return <div className="rounded-xl border border-slate-200 bg-white p-4">{content}</div>;
  return (
    <div className="fixed inset-x-3 bottom-20 z-40 md:bottom-3 mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:right-4 sm:left-auto">
      {content}
    </div>
  );
}
