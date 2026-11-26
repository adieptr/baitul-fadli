import { CheckCircle2 } from "lucide-react";

/** Pesan sukses setelah redirect (?saved=1 / ?deleted=1). */
export function Flash({ params }: { params: Record<string, string | string[] | undefined> }) {
  const msg = params.saved ? "Data berhasil disimpan." : params.deleted ? "Data berhasil dihapus." : null;
  if (!msg) return null;
  return (
    <div role="status" className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
      <CheckCircle2 className="size-5 shrink-0" aria-hidden /> {msg}
    </div>
  );
}
