"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminOrNull } from "@/lib/auth";
import {
  dbErrorMessage,
  failure,
  formObject,
  success,
  validationFailure,
  type ActionState,
} from "@/lib/action-state";
import { categorySchema, openingBalanceSchema, reportSchema, transactionSchema } from "@/lib/validation";

const FORBIDDEN = failure("Anda tidak memiliki akses admin.");
const idSchema = z.uuid();

function revalidateFinance() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

// ---------------- Transaksi ----------------
export async function saveTransactionAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const parsed = transactionSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const id = formData.get("id");
  const supabase = await createClient();

  if (id) {
    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) return failure("ID tidak valid.");
    const { error } = await supabase.from("transactions").update(parsed.data).eq("id", idParsed.data);
    if (error) return failure(dbErrorMessage(error));
    revalidateFinance();
    return success("Transaksi berhasil diperbarui.");
  }
  const { error } = await supabase.from("transactions").insert(parsed.data);
  if (error) return failure(dbErrorMessage(error));
  revalidateFinance();
  if (formData.get("_after") === "new") return success("Transaksi berhasil disimpan. Silakan isi transaksi berikutnya.");
  redirect("/admin/keuangan?saved=1");
}

export async function deleteTransactionAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return failure("ID tidak valid.");
  const supabase = await createClient();
  const { data: tx } = await supabase.from("transactions").select("proof_path, donation_period_id").eq("id", id.data).maybeSingle();
  if (tx?.donation_period_id)
    return failure("Transaksi ini dibuat otomatis dari verifikasi donatur. Ubah status pembayaran donatur untuk membatalkannya.");
  const { error } = await supabase.from("transactions").delete().eq("id", id.data);
  if (error) return failure(dbErrorMessage(error));
  if (tx?.proof_path) await supabase.storage.from("transaction-proofs").remove([tx.proof_path]);
  revalidateFinance();
  redirect("/admin/keuangan?deleted=1");
}

// ---------------- Kategori ----------------
export async function saveCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const parsed = categorySchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();
  const id = formData.get("id");
  const payload = { name: parsed.data.name, sort_order: parsed.data.sort_order ?? 0 };
  const { error } = id
    ? await supabase.from("categories").update(payload).eq("id", String(id))
    : await supabase.from("categories").insert({ ...payload, type: parsed.data.type });
  if (error) return failure(dbErrorMessage(error));
  revalidatePath("/admin/kategori");
  return success(id ? "Kategori diperbarui." : "Kategori ditambahkan.");
}

export async function toggleCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return failure("ID tidak valid.");
  const active = formData.get("is_active") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ is_active: active }).eq("id", id.data);
  if (error) return failure(dbErrorMessage(error));
  revalidatePath("/admin/kategori");
  return success(active ? "Kategori diaktifkan." : "Kategori dinonaktifkan.");
}

export async function deleteCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return failure("ID tidak valid.");
  const supabase = await createClient();
  const { error, count } = await supabase.from("categories").delete({ count: "exact" }).eq("id", id.data);
  if (error) {
    if (error.code === "23503") return failure("Kategori sudah dipakai transaksi. Nonaktifkan saja agar riwayat tetap utuh.");
    return failure(dbErrorMessage(error));
  }
  if (!count) return failure("Kategori sistem tidak dapat dihapus.");
  revalidatePath("/admin/kategori");
  return success("Kategori dihapus.");
}

// ---------------- Laporan ----------------
export async function saveReportAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const parsed = reportSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();
  const id = formData.get("id");
  if (id) {
    const { error, count } = await supabase
      .from("financial_reports")
      .update(parsed.data, { count: "exact" })
      .eq("id", String(id));
    if (error) return failure(dbErrorMessage(error));
    if (!count) return failure("Laporan yang sudah dipublikasikan tidak dapat diubah. Batalkan publikasi terlebih dahulu.");
    revalidatePath("/admin/laporan", "layout");
    return success("Laporan diperbarui.");
  }
  const { data, error } = await supabase.from("financial_reports").insert(parsed.data).select("id").single();
  if (error) return failure(dbErrorMessage(error));
  revalidatePath("/admin/laporan");
  redirect(`/admin/laporan/${data.id}`);
}

export async function publishReportAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return failure("ID tidak valid.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_report", { p_report_id: id.data });
  if (error) return failure(dbErrorMessage(error));
  revalidateFinance();
  return success("Laporan berhasil dipublikasikan dan kini tampil di halaman publik. Transaksi pada periode ini terkunci.");
}

export async function unpublishReportAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return failure("ID tidak valid.");
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 5) return failure("Alasan pembatalan wajib diisi (minimal 5 karakter).", { reason: ["Wajib diisi."] });
  const supabase = await createClient();
  const { error } = await supabase.rpc("unpublish_report", { p_report_id: id.data, p_reason: reason });
  if (error) return failure(dbErrorMessage(error));
  revalidateFinance();
  return success("Publikasi laporan dibatalkan. Laporan kembali menjadi draf dan transaksi dapat dikoreksi.");
}

export async function deleteReportAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return failure("ID tidak valid.");
  const supabase = await createClient();
  const { error, count } = await supabase.from("financial_reports").delete({ count: "exact" }).eq("id", id.data);
  if (error) return failure(dbErrorMessage(error));
  if (!count) return failure("Hanya laporan draf yang dapat dihapus.");
  revalidatePath("/admin/laporan");
  redirect("/admin/laporan?deleted=1");
}

/**
 * Hapus transaksi otomatis dari verifikasi donatur: status tagihannya
 * dikembalikan menjadi "Belum Dibayar" (transaksi ikut terhapus di database)
 * dan alasannya tercatat di log aktivitas.
 */
export async function cancelAutoTransactionAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return failure("ID tidak valid.");
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 5) return failure("Alasan wajib diisi (minimal 5 karakter).", { reason: ["Wajib diisi."] });
  const supabase = await createClient();
  const { data: tx } = await supabase.from("transactions").select("donation_period_id").eq("id", id.data).maybeSingle();
  if (!tx?.donation_period_id) return failure("Transaksi ini bukan transaksi otomatis donatur.");
  const { error } = await supabase.rpc("set_period_status", {
    p_period_id: tx.donation_period_id,
    p_status: "unpaid",
    p_admin_note: reason.slice(0, 300),
    p_record_income: false,
  });
  if (error) return failure(dbErrorMessage(error));
  revalidateFinance();
  redirect("/admin/keuangan?deleted=1");
}

// ---------------- Saldo awal akun ----------------
export async function setOpeningBalanceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const parsed = openingBalanceSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_account_opening", { p_account: parsed.data.account, p_amount: parsed.data.amount });
  if (error) return failure(dbErrorMessage(error));
  revalidateFinance();
  revalidatePath("/admin/buku-besar");
  return success("Saldo awal diperbarui.");
}
