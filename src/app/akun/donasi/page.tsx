import { Card, PageHeader } from "@/components/ui/card";
import { SubscriptionBadge } from "@/components/ui/badge";
import { ActionForm, ConfirmButton } from "@/components/ui/form";
import { SubscriptionForm } from "@/components/donor/subscription-form";
import { requireUser } from "@/lib/auth";
import { getDonorData } from "@/lib/queries/donor";
import { setSubscriptionStatusAction } from "@/lib/actions/donor";

export const metadata = { title: "Atur Donasi" };

export default async function DonationSettingsPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser("/akun/donasi");
  const { subscription } = await getDonorData(user.id);
  const { welcome } = await searchParams;

  return (
    <div className="space-y-6">
      {welcome && (
        <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-base text-emerald-900">
          Akun Anda berhasil dibuat. Silakan atur nominal dan jadwal donasi di bawah ini.
        </div>
      )}
      <PageHeader
        title={subscription ? "Pengaturan Donasi Rutin" : "Daftar Donatur Tetap"}
        description="Tentukan nominal dan jadwal. Anda dapat mengubahnya kapan saja."
        action={subscription && <SubscriptionBadge status={subscription.status} />}
      />
      <Card>
        <SubscriptionForm
          initial={
            subscription
              ? {
                  amount: Number(subscription.amount),
                  frequency: subscription.frequency,
                  day_of_week: subscription.day_of_week,
                  day_of_month: subscription.day_of_month,
                }
              : null
          }
        />
      </Card>

      {subscription && (
        <Card>
          <h2 className="text-base font-bold">Status Donasi Rutin</h2>
          <p className="mt-1 text-slate-600">
            Jeda bila sedang berhalangan sementara. Selama dijeda/berhenti, tagihan dan pengingat baru tidak dibuat.
          </p>
          <ActionForm action={setSubscriptionStatusAction} className="mt-4 flex flex-wrap gap-3">
            {subscription.status !== "active" && (
              <ConfirmButton
                label="Aktifkan Kembali"
                title="Aktifkan donasi rutin?"
                message="Tagihan dan pengingat akan kembali dibuat sesuai jadwal Anda."
                confirmName="status"
                confirmValue="active"
              />
            )}
            {subscription.status === "active" && (
              <ConfirmButton
                label="Jeda Sementara"
                variant="secondary"
                title="Jeda donasi rutin?"
                message="Tagihan dan pengingat tidak akan dibuat sampai Anda mengaktifkannya kembali."
                confirmName="status"
                confirmValue="paused"
              />
            )}
            {subscription.status !== "stopped" && (
              <ConfirmButton
                label="Berhenti"
                variant="ghost"
                title="Berhenti menjadi donatur tetap?"
                message="Riwayat donasi Anda tetap tersimpan. Anda dapat mendaftar kembali kapan saja."
                confirmLabel="Ya, Berhenti"
                confirmName="status"
                confirmValue="stopped"
              />
            )}
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
