import { Card, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, ConfirmButton } from "@/components/ui/form";
import { Pagination } from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { setUserRoleAction } from "@/lib/actions/admin-donors";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Pengguna & Role" };
const PAGE_SIZE = 30;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, created_at", { count: "exact" })
    .order("role")
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) {
    const safe = q.replace(/[%_\\,()]/g, "");
    query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
  }
  const { data: users, count } = await query;

  return (
    <div className="space-y-6">
      <PageHeader title="Pengguna & Role" description="Hanya berikan hak admin kepada pengurus yang dipercaya (amanah)." />
      <Card>
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1">
            <span className="block font-semibold">Cari nama atau email</span>
            <input name="q" defaultValue={q} className="block min-h-10 w-full rounded-xl border border-slate-300 px-3" />
          </label>
          <Button type="submit" variant="secondary">Cari</Button>
        </form>
      </Card>
      <ul className="space-y-3">
        {(users ?? []).map((u) => (
          <li key={u.id}>
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="flex flex-wrap items-center gap-2 text-base font-bold">
                  {u.full_name || "(tanpa nama)"} {u.role === "admin" && <Badge tone="brand">Admin</Badge>}
                  {u.id === me.id && <Badge>Anda</Badge>}
                </p>
                <p className="break-all text-slate-600">{u.email} {u.phone && `· ${u.phone}`}</p>
                <p className="text-sm text-slate-500">Terdaftar {formatDateTime(u.created_at)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
              {u.id !== me.id && <ResetPasswordButton userId={u.id} name={u.full_name} phone={u.phone} />}
              <ActionForm action={setUserRoleAction}>
                <input type="hidden" name="user_id" value={u.id} />
                {u.role === "admin" ? (
                  <ConfirmButton label="Cabut Admin" variant="ghost" size="sm" title="Cabut hak admin?" message={`${u.full_name} tidak dapat lagi mengakses dashboard admin.`} confirmName="role" confirmValue="user" confirmLabel="Cabut" />
                ) : (
                  <ConfirmButton label="Jadikan Admin" variant="secondary" size="sm" title="Jadikan admin?" message={`${u.full_name} akan memiliki akses penuh ke keuangan, donatur, dan pengaturan.`} confirmName="role" confirmValue="admin" confirmLabel="Ya, Jadikan Admin" />
                )}
              </ActionForm>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/pengguna" baseParams={{ q: q || undefined }} />
    </div>
  );
}
