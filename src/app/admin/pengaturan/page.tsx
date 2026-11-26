import { Card, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionForm, SubmitButton, TextField, TextAreaField } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { publicMediaUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { saveSettingsAction } from "@/lib/actions/admin-content";
import { runRemindersNowAction, setupTelegramWebhookAction } from "@/lib/actions/admin-donors";
import { getTelegramWebhookInfo } from "@/lib/telegram";
import { serverEnv } from "@/lib/server-env";
import { publicEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: s }, { data: lastRun }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).single(),
    supabase.from("reminder_logs").select("created_at, status").in("kind", ["due", "followup"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const tgConfigured = serverEnv.telegramConfigured();
  const webhook = tgConfigured ? await getTelegramWebhookInfo().catch(() => null) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan" description="Profil masjid, kontak, rekening, dan integrasi Telegram." />
      <Card>
        <h2 className="mb-4 text-lg font-bold">Profil &amp; Kontak Masjid</h2>
        <ActionForm action={saveSettingsAction} className="space-y-5">
          <TextField label="Nama Masjid" name="mosque_name" defaultValue={s?.mosque_name} required maxLength={120} />
          <TextField label="Slogan / Tagline" name="tagline" defaultValue={s?.tagline} maxLength={200} />
          <FileUpload
            name="hero_image_path"
            label="Foto Sampul Beranda (opsional)"
            bucket="public-media"
            folder="site"
            defaultPath={s?.hero_image_path}
            previewUrl={publicMediaUrl(s?.hero_image_path)}
            hint="Gunakan foto asli masjid (landscape). Jika kosong, beranda menampilkan ilustrasi masjid."
          />
          <TextAreaField
            label="Profil Masjid (artikel di beranda)"
            name="profile_content"
            rows={18}
            defaultValue={s?.profile_content}
            maxLength={20000}
            hint={
              <>
                Satu artikel berisi sambutan, sejarah, visi, dan misi. Format: <code>## Subjudul</code>, <code>- poin</code>,{" "}
                <code>&gt; kutipan</code>, <code>**tebal**</code>. Pisahkan paragraf dengan baris kosong.
              </>
            }
          />
          <TextAreaField label="Alamat" name="address" rows={2} defaultValue={s?.address} maxLength={500} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Telepon" name="phone" type="tel" defaultValue={s?.phone} maxLength={30} />
            <TextField label="WhatsApp" name="whatsapp" type="tel" defaultValue={s?.whatsapp} maxLength={30} hint="Contoh: 081234567890" />
            <TextField label="Email" name="email" type="email" defaultValue={s?.email} maxLength={120} />
            <TextField label="Jam Layanan" name="service_hours" defaultValue={s?.service_hours} maxLength={200} placeholder="Setiap hari, 07.00–17.00 WIB" />
            <TextField label="Link Google Maps" name="maps_url" type="url" defaultValue={s?.maps_url} placeholder="https://maps.app.goo.gl/..." />
          </div>
          <TextAreaField
            label="Info Rekening / Cara Pembayaran"
            name="payment_info"
            rows={4}
            defaultValue={s?.payment_info}
            maxLength={2000}
            hint="Tampil di halaman donasi dan di pesan pengingat Telegram. Contoh: BSI 1234567890 a.n. Masjid Baitul Fadli"
          />
          <SubmitButton size="lg">Simpan Pengaturan</SubmitButton>
        </ActionForm>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold">Integrasi Telegram</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-slate-600">Bot</dt>
            <dd className="font-semibold">{publicEnv.telegramBotUsername ? `@${publicEnv.telegramBotUsername}` : "Belum diatur"}</dd>
          </div>
          <div>
            <dt className="text-slate-600">Token server</dt>
            <dd>{tgConfigured ? <Badge tone="success">Terkonfigurasi</Badge> : <Badge tone="danger">Belum diatur</Badge>}</dd>
          </div>
          <div>
            <dt className="text-slate-600">Webhook</dt>
            <dd className="break-all">
              {webhook?.url ? <Badge tone="success">Aktif</Badge> : <Badge tone="warning">Belum aktif</Badge>}{" "}
              {webhook?.lastError && <span className="text-sm text-red-700">Error terakhir: {webhook.lastError}</span>}
            </dd>
          </div>
          <div>
            <dt className="text-slate-600">Pengingat otomatis terakhir</dt>
            <dd>{lastRun ? formatDateTime(lastRun.created_at) : "Belum pernah"}</dd>
          </div>
        </dl>
        <div className="flex flex-col gap-4 sm:flex-row">
          <ActionForm action={setupTelegramWebhookAction}>
            <SubmitButton variant="secondary">Aktifkan / Perbarui Webhook</SubmitButton>
          </ActionForm>
          <ActionForm action={runRemindersNowAction}>
            <SubmitButton variant="secondary">Jalankan Pengingat Sekarang</SubmitButton>
          </ActionForm>
        </div>
        <p className="text-sm text-slate-600">
          Pengingat otomatis berjalan setiap hari pukul ±07.00 WIB melalui Vercel Cron. Tombol &quot;Jalankan Sekarang&quot; aman
          ditekan berulang — sistem tidak akan mengirim pengingat ganda.
        </p>
      </Card>
    </div>
  );
}
