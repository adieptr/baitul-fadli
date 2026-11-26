"use client";

import { ActionForm, CheckboxField, SubmitButton, TextField, TextAreaField } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { saveEventAction } from "@/lib/actions/admin-content";

type Ev = {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  image_path: string | null;
  is_published: boolean;
};

export function EventForm({ initial, imageUrl, today }: { initial?: Ev; imageUrl?: string | null; today: string }) {
  return (
    <ActionForm action={saveEventAction} className="space-y-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <TextField label="Judul Kegiatan" name="title" defaultValue={initial?.title} maxLength={150} required />
      <div className="grid gap-5 sm:grid-cols-3">
        <TextField label="Tanggal" name="event_date" type="date" defaultValue={initial?.event_date ?? today} required />
        <TextField label="Jam Mulai" name="start_time" type="time" defaultValue={initial?.start_time?.slice(0, 5) ?? ""} />
        <TextField label="Jam Selesai" name="end_time" type="time" defaultValue={initial?.end_time?.slice(0, 5) ?? ""} />
      </div>
      <TextField label="Lokasi" name="location" defaultValue={initial?.location ?? "Masjid Baitul Fadli"} maxLength={200} />
      <TextAreaField label="Deskripsi" name="description" rows={6} defaultValue={initial?.description} maxLength={5000} />
      <FileUpload
        name="image_path"
        label="Gambar / Poster (opsional)"
        bucket="public-media"
        folder="events"
        defaultPath={initial?.image_path}
        previewUrl={imageUrl}
        hint="Gambar akan diperkecil otomatis agar ringan dibuka."
      />
      <CheckboxField
        name="is_published"
        defaultChecked={initial?.is_published ?? true}
        label="Tampilkan di website (publikasikan)"
        hint="Hilangkan centang untuk menyimpan sebagai draf."
      />
      <SubmitButton size="lg" pendingText="Menyimpan…">
        Simpan Agenda
      </SubmitButton>
    </ActionForm>
  );
}
