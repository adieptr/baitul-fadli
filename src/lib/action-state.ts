import { z } from "zod";

export type ActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** penanda unik agar UI tahu ada hasil baru */
  ts?: number;
};

export const initialState: ActionState = { ok: false, message: "" };

export function success(message: string): ActionState {
  return { ok: true, message, ts: Date.now() };
}

export function failure(message: string, fieldErrors?: ActionState["fieldErrors"]): ActionState {
  return { ok: false, message, fieldErrors, ts: Date.now() };
}

export function validationFailure(error: z.ZodError): ActionState {
  return failure("Mohon periksa kembali isian yang ditandai.", z.flattenError(error).fieldErrors);
}

/** Terjemahkan error database menjadi pesan yang ramah pengguna. */
export function dbErrorMessage(error: { message?: string; code?: string } | null | undefined): string {
  const msg = error?.message ?? "";
  const custom = /^[A-Z_]+: (.+)$/.exec(msg);
  if (custom) return custom[1];
  if (msg.startsWith("FORBIDDEN") || error?.code === "42501") return "Anda tidak memiliki akses untuk tindakan ini.";
  if (error?.code === "23505") return "Data yang sama sudah ada.";
  if (error?.code === "23503") return "Data ini masih dipakai oleh data lain sehingga tidak bisa dihapus.";
  if (error?.code === "23514") return "Ada isian yang tidak memenuhi ketentuan.";
  return "Terjadi kesalahan. Silakan coba lagi.";
}

export function formObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$ACTION")) obj[k] = v;
  }
  return obj;
}
