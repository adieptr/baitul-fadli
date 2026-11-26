import { Card, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionForm, CheckboxField, ConfirmButton, MoneyField, SubmitButton, TextField, TextAreaField } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { deleteProgramAction, saveProgramAction } from "@/lib/actions/admin-content";

export const metadata = { title: "Program Donasi" };

export default async function ProgramsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: programs } = await supabase.from("donation_programs").select("*").order("sort_order").order("created_at");

  return (
    <div className="space-y-6">
      <PageHeader title="Program Donasi" description="Program yang aktif tampil di halaman publik." />
      <Card>
        <h2 className="mb-4 text-xl font-bold">Tambah Program</h2>
        <ActionForm action={saveProgramAction} className="space-y-4" resetOnSuccess>
          <TextField label="Judul Program" name="title" required maxLength={120} />
          <TextAreaField label="Deskripsi" name="description" rows={3} maxLength={3000} />
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField label="Target Dana (opsional)" name="target_amount" />
            <TextField label="Urutan Tampil" name="sort_order" type="number" min={0} max={999} defaultValue={0} />
          </div>
          <CheckboxField name="is_active" defaultChecked label="Tampilkan di website" />
          <SubmitButton>Tambah Program</SubmitButton>
        </ActionForm>
      </Card>
      {(programs ?? []).map((p) => (
        <Card key={p.id}>
          <div className="mb-3 flex items-center gap-2">
            <Badge tone={p.is_active ? "success" : "neutral"}>{p.is_active ? "Tampil" : "Disembunyikan"}</Badge>
          </div>
          <ActionForm action={saveProgramAction} className="space-y-4">
            <input type="hidden" name="id" value={p.id} />
            <TextField label="Judul Program" name="title" defaultValue={p.title} required maxLength={120} />
            <TextAreaField label="Deskripsi" name="description" rows={3} defaultValue={p.description} maxLength={3000} />
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyField label="Target Dana (opsional)" name="target_amount" defaultValue={p.target_amount} />
              <TextField label="Urutan Tampil" name="sort_order" type="number" min={0} max={999} defaultValue={p.sort_order} />
            </div>
            <CheckboxField name="is_active" defaultChecked={p.is_active} label="Tampilkan di website" />
            <SubmitButton variant="secondary">Simpan</SubmitButton>
          </ActionForm>
          <ActionForm action={deleteProgramAction} className="mt-3">
            <input type="hidden" name="id" value={p.id} />
            <ConfirmButton label="Hapus" variant="ghost" size="sm" title="Hapus program?" message={`"${p.title}" akan dihapus.`} confirmLabel="Hapus" />
          </ActionForm>
        </Card>
      ))}
    </div>
  );
}
