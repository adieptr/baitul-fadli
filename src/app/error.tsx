"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ retry }: { error: Error; retry: () => void }) {
  return (
    <main id="konten" className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold">Maaf, terjadi kendala</h1>
      <p className="mt-2 text-lg text-slate-600">Silakan coba lagi. Jika masih terjadi, hubungi pengurus masjid.</p>
      <Button size="lg" className="mt-6" onClick={() => retry()}>
        Coba Lagi
      </Button>
    </main>
  );
}
