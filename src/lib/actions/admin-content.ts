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
import { eventSchema, programSchema, settingsSchema } from "@/lib/validation";

const FORBIDDEN = failure("Anda tidak memiliki akses admin.");
const idSchema = z.uuid();

// ---------------- Agenda ----------------
export async function saveEventAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const parsed = eventSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();
  const id = formData.get("id");
  if (id) {
    const idOk = idSchema.safeParse(id);
    if (!idOk.success) return failure("ID tidak valid.");
    const { data: old } = await supabase.from("events").select("image_path").eq("id", idOk.data).maybeSingle();
    const { error } = await supabase.from("events").update(parsed.data).eq("id", idOk.data);
    if (error) return failure(dbErrorMessage(error));
    if (old?.image_path && old.image_path !== parsed.data.image_path) {
      await supabase.storage.from("public-media").remove([old.image_path]);
    }
  } else {
    const { error } = await supabase.from("events").insert(parsed.data);
    if (error) return failure(dbErrorMessage(error));
  }
  revalidatePath("/admin/agenda");
  revalidatePath("/", "layout");
  redirect("/admin/agenda?saved=1");
}

export async function deleteEventAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return failure("ID tidak valid.");
  const supabase = await createClient();
  const { data: ev } = await supabase.from("events").select("image_path").eq("id", id.data).maybeSingle();
  const { error } = await supabase.from("events").delete().eq("id", id.data);
  if (error) return failure(dbErrorMessage(error));
  if (ev?.image_path) await supabase.storage.from("public-media").remove([ev.image_path]);
  revalidatePath("/admin/agenda");
  revalidatePath("/", "layout");
  redirect("/admin/agenda?deleted=1");
}

// ---------------- Program donasi ----------------
export async function saveProgramAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const parsed = programSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();
  const id = formData.get("id");
  const payload = { ...parsed.data, sort_order: parsed.data.sort_order ?? 0 };
  const { error } = id
    ? await supabase.from("donation_programs").update(payload).eq("id", String(id))
    : await supabase.from("donation_programs").insert(payload);
  if (error) return failure(dbErrorMessage(error));
  revalidatePath("/admin/program");
  revalidatePath("/", "layout");
  return success(id ? "Program diperbarui." : "Program ditambahkan.");
}

export async function deleteProgramAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return failure("ID tidak valid.");
  const supabase = await createClient();
  const { error } = await supabase.from("donation_programs").delete().eq("id", id.data);
  if (error) return failure(dbErrorMessage(error));
  revalidatePath("/admin/program");
  revalidatePath("/", "layout");
  return success("Program dihapus.");
}

// ---------------- Pengaturan situs ----------------
export async function saveSettingsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminOrNull())) return FORBIDDEN;
  const parsed = settingsSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();
  const { data: old } = await supabase.from("site_settings").select("hero_image_path").eq("id", 1).maybeSingle();
  const { error } = await supabase.from("site_settings").update(parsed.data).eq("id", 1);
  if (error) return failure(dbErrorMessage(error));
  if (old?.hero_image_path && old.hero_image_path !== parsed.data.hero_image_path) {
    await supabase.storage.from("public-media").remove([old.hero_image_path]);
  }
  revalidatePath("/", "layout");
  return success("Pengaturan berhasil disimpan.");
}
