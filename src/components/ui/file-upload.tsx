"use client";

import { useRef, useState } from "react";
import { FileText, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import { Button } from "./button";

type Bucket = "public-media" | "transaction-proofs" | "payment-proofs";

/** Perkecil foto di perangkat sebelum diunggah (hemat kuota & cepat di sinyal lemah). */
async function compressImage(file: File, maxSize = 1600, quality = 0.8): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  return blob && blob.size < file.size ? blob : file;
}

export function FileUpload({
  name,
  label,
  bucket,
  folder,
  defaultPath,
  previewUrl,
  allowPdf = false,
  hint,
}: {
  name: string;
  label: string;
  bucket: Bucket;
  /** awalan path; untuk payment-proofs WAJIB id user */
  folder: string;
  defaultPath?: string | null;
  previewUrl?: string | null;
  allowPdf?: boolean;
  hint?: string;
}) {
  const [path, setPath] = useState(defaultPath ?? "");
  const [preview, setPreview] = useState<string | null>(previewUrl ?? null);
  const [isPdf, setIsPdf] = useState(Boolean(defaultPath?.endsWith(".pdf")));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const pdf = file.type === "application/pdf";
    if (!file.type.startsWith("image/") && !(allowPdf && pdf)) {
      setError(allowPdf ? "File harus berupa foto (JPG/PNG/WEBP) atau PDF." : "File harus berupa foto (JPG/PNG/WEBP).");
      return;
    }
    setBusy(true);
    try {
      const blob = pdf ? file : await compressImage(file);
      if (blob.size > 3 * 1024 * 1024) throw new Error("Ukuran file maksimal 3 MB.");
      const ext = pdf ? "pdf" : blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const newPath = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await getBrowserClient()
        .storage.from(bucket)
        .upload(newPath, blob, { contentType: pdf ? "application/pdf" : blob.type || file.type, upsert: false });
      if (upErr) throw new Error("Gagal mengunggah file. Periksa koneksi lalu coba lagi.");
      setPath(newPath);
      setIsPdf(pdf);
      setPreview(pdf ? null : URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-base font-semibold text-slate-800">{label}</span>
      <input type="hidden" name={name} value={path} />
      <input
        ref={inputRef}
        type="file"
        accept={allowPdf ? "image/*,application/pdf" : "image/*"}
        className="sr-only"
        onChange={onChange}
        tabIndex={-1}
      />
      {path ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Pratinjau" className="h-24 w-24 rounded-lg object-cover" />
          ) : (
            <span className="flex items-center gap-2 text-slate-700">
              <FileText className="size-8" /> {isPdf ? "Dokumen PDF terunggah" : "File terunggah"}
            </span>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              Ganti
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPath("");
                setPreview(null);
              }}
            >
              <Trash2 className="size-5" /> Hapus
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy} className="w-full sm:w-auto">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          {busy ? "Mengunggah…" : "Pilih / Ambil Foto"}
        </Button>
      )}
      {hint && !error && <p className="text-sm text-slate-600">{hint}</p>}
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
