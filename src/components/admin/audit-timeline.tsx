import { formatDateTime } from "@/lib/format";
import type { Json } from "@/lib/database.types";

const ACTION_LABEL: Record<string, string> = {
  insert: "Dibuat",
  update: "Diubah",
  delete: "Dihapus",
  publish_report: "Laporan dipublikasikan",
  unpublish_report: "Publikasi dibatalkan",
  set_payment_status: "Status pembayaran diubah",
  confirm_payment: "Donatur konfirmasi bayar",
  set_role: "Role diubah",
  telegram_linked: "Telegram terhubung",
  account_deleted: "Akun dihapus",
  set_opening_balance: "Saldo awal diubah",
  password_reset: "Kata sandi direset",
};

const FIELD_LABEL: Record<string, string> = {
  amount: "Nominal",
  type: "Jenis",
  category_id: "Kategori",
  transaction_date: "Tanggal",
  description: "Keterangan",
  proof_path: "Bukti",
  title: "Judul",
  status: "Status",
  is_published: "Terbit",
  event_date: "Tanggal",
  name: "Nama",
  is_active: "Aktif",
  frequency: "Jadwal",
  day_of_week: "Hari",
  day_of_month: "Tanggal",
  period_start: "Awal periode",
  period_end: "Akhir periode",
};
const IGNORED = new Set(["updated_at", "updated_by", "created_at", "created_by", "id", "breakdown", "published_by"]);

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v).slice(0, 120);
}

export type AuditEntry = {
  id: number;
  action: string;
  details: Json;
  created_at: string;
  entity?: string;
  entity_id?: string | null;
  profiles: { full_name: string } | null;
};

export function AuditTimeline({ entries, showEntity = false }: { entries: AuditEntry[]; showEntity?: boolean }) {
  if (!entries.length) return <p className="text-slate-600">Belum ada riwayat.</p>;
  return (
    <ol className="space-y-4 border-l-4 border-brand-100 pl-5">
      {entries.map((e) => {
        const d = (e.details ?? {}) as Record<string, unknown>;
        const oldRow = (d.old ?? {}) as Record<string, unknown>;
        const newRow = (d.new ?? {}) as Record<string, unknown>;
        const changes =
          e.action === "update"
            ? Object.keys(newRow).filter((k) => !IGNORED.has(k) && JSON.stringify(oldRow[k]) !== JSON.stringify(newRow[k]))
            : [];
        return (
          <li key={e.id} className="relative">
            <span className="absolute top-1.5 -left-[1.85rem] size-4 rounded-full bg-brand-700 ring-4 ring-white" aria-hidden />
            <p className="font-semibold">
              {ACTION_LABEL[e.action] ?? e.action}
              {showEntity && e.entity && <span className="font-normal text-slate-600"> · {e.entity}</span>}
            </p>
            <p className="text-sm text-slate-600">
              {formatDateTime(e.created_at)} · oleh {e.profiles?.full_name ?? "Sistem"}
            </p>
            {changes.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-sm">
                {changes.map((k) => (
                  <li key={k}>
                    <span className="font-medium">{FIELD_LABEL[k] ?? k}:</span>{" "}
                    <span className="text-red-700 line-through">{show(oldRow[k])}</span> →{" "}
                    <span className="text-emerald-800">{show(newRow[k])}</span>
                  </li>
                ))}
              </ul>
            )}
            {e.action !== "update" && e.action !== "insert" && e.action !== "delete" && Object.keys(d).length > 0 && (
              <p className="mt-1 text-sm break-words text-slate-700">
                {Object.entries(d)
                  .filter(([k]) => !["breakdown", "previous"].includes(k))
                  .map(([k, v]) => `${k}: ${show(v)}`)
                  .join(" · ")}
              </p>
            )}
            {e.action === "delete" && oldRow.description ? (
              <p className="mt-1 text-sm text-slate-700">
                {show(oldRow.description)} · {show(oldRow.amount)}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
