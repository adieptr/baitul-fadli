import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="konten" className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-extrabold text-brand-700">404</p>
      <h1 className="mt-4 text-xl font-bold">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-base text-slate-600">Halaman yang Anda cari mungkin sudah dipindahkan atau tidak tersedia.</p>
      <LinkButton href="/" size="lg" className="mt-6">
        Kembali ke Beranda
      </LinkButton>
    </main>
  );
}
