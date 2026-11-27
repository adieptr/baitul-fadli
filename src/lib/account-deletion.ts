import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Menghapus akun beserta data pribadinya (profil, jadwal donasi, tagihan,
 * tautan Telegram, foto bukti transfer). Transaksi kas masjid tetap tersimpan
 * tanpa tautan ke donatur (FK "on delete set null").
 */
export async function purgeAccount(
  userId: string,
  audit: { actorId: string | null; by: "self" | "admin"; reason?: string },
): Promise<{ ok: boolean }> {
  const service = createServiceClient();
  const { data: files } = await service.storage.from("payment-proofs").list(userId, { limit: 1000 });
  if (files?.length) {
    await service.storage.from("payment-proofs").remove(files.map((f) => `${userId}/${f.name}`));
  }
  // Jejak audit tanpa data pribadi donatur
  await service.from("audit_logs").insert({
    actor_id: audit.actorId,
    action: "account_deleted",
    entity: "profiles",
    entity_id: userId,
    details: audit.reason ? { by: audit.by, reason: audit.reason } : { by: audit.by },
  });
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) console.error("purgeAccount", error.message);
  return { ok: !error };
}
