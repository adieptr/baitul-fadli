import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/card";
import { ActionForm, ConfirmButton } from "@/components/ui/form";
import { EventForm } from "@/components/admin/event-form";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { deleteEventAction } from "@/lib/actions/admin-content";
import { publicMediaUrl } from "@/lib/storage";
import { jakartaToday } from "@/lib/schedule";

export const metadata = { title: "Ubah Agenda" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: ev } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!ev) notFound();
  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/agenda" className="inline-flex min-h-12 items-center gap-2 font-semibold text-brand-800">
        <ArrowLeft className="size-5" aria-hidden /> Kembali
      </Link>
      <PageHeader title="Ubah Agenda" />
      <Card>
        <EventForm initial={ev} imageUrl={publicMediaUrl(ev.image_path)} today={jakartaToday()} />
      </Card>
      <ActionForm action={deleteEventAction}>
        <input type="hidden" name="id" value={ev.id} />
        <ConfirmButton label="Hapus Agenda" variant="danger" title="Hapus agenda ini?" message={`"${ev.title}" akan dihapus permanen.`} confirmLabel="Ya, Hapus" />
      </ActionForm>
    </div>
  );
}
