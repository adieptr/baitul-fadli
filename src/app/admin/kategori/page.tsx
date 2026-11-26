import { Card, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionForm, ConfirmButton, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/queries/admin";
import { deleteCategoryAction, saveCategoryAction, toggleCategoryAction } from "@/lib/actions/admin-finance";

export const metadata = { title: "Kategori" };

export default async function CategoriesPage() {
  await requireAdmin();
  const categories = await getCategories();
  const groups = [
    ["income", "Kategori Pemasukan"],
    ["expense", "Kategori Pengeluaran"],
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader title="Kategori Transaksi" description="Kelompokkan transaksi agar laporan mudah dipahami." />
      <Card>
        <h2 className="mb-4 text-lg font-bold">Tambah Kategori</h2>
        <ActionForm action={saveCategoryAction} className="grid gap-4 md:grid-cols-4" resetOnSuccess>
          <TextField label="Nama Kategori" name="name" required className="md:col-span-2" />
          <SelectField
            label="Jenis"
            name="type"
            options={[
              { value: "income", label: "Pemasukan" },
              { value: "expense", label: "Pengeluaran" },
            ]}
          />
          <div className="flex items-end">
            <SubmitButton className="w-full">Tambah</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      {groups.map(([type, title]) => (
        <Card key={type}>
          <h2 className="mb-4 text-lg font-bold">{title}</h2>
          <ul className="divide-y divide-slate-100">
            {categories
              .filter((c) => c.type === type)
              .map((c) => (
                <li key={c.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-end">
                  <ActionForm action={saveCategoryAction} className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end" hideAlert={false}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="type" value={c.type} />
                    <TextField label="Nama" name="name" defaultValue={c.name} className="flex-1" required />
                    <TextField label="Urutan" name="sort_order" type="number" min={0} max={999} defaultValue={c.sort_order} className="sm:w-28" />
                    <SubmitButton variant="secondary" size="sm">Simpan</SubmitButton>
                  </ActionForm>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.is_system && <Badge tone="info">Sistem</Badge>}
                    {!c.is_active && <Badge tone="neutral">Nonaktif</Badge>}
                    <ActionForm action={toggleCategoryAction} hideAlert>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="is_active" value={String(!c.is_active)} />
                      <SubmitButton variant="ghost" size="sm">{c.is_active ? "Nonaktifkan" : "Aktifkan"}</SubmitButton>
                    </ActionForm>
                    {!c.is_system && (
                      <ActionForm action={deleteCategoryAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmButton label="Hapus" variant="ghost" size="sm" title={`Hapus kategori "${c.name}"?`} message="Kategori yang sudah dipakai transaksi tidak dapat dihapus — nonaktifkan saja." confirmLabel="Hapus" />
                      </ActionForm>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
