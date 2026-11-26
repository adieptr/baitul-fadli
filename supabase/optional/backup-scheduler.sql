-- =====================================================================
-- OPSIONAL: Penjadwal cadangan via Supabase (pg_cron + pg_net), gratis.
-- Vercel Cron (Hobby) sudah memanggil endpoint 1x/hari pukul 07.00 WIB.
-- Script ini menambah panggilan cadangan pukul 08.30 WIB. Aman: sistem
-- idempoten, tidak ada tagihan/pengingat ganda.
--
-- Cara pakai: Supabase Dashboard → SQL Editor. Ganti DOMAIN & CRON_SECRET.
-- Secret disimpan di Supabase Vault (terenkripsi), bukan teks biasa.
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('GANTI_DENGAN_CRON_SECRET', 'baitulfadli_cron_secret');

select cron.schedule(
  'baitulfadli-reminder-backup',
  '30 1 * * *', -- 01:30 UTC = 08:30 WIB
  $$
  select net.http_get(
    url := 'https://GANTI-DOMAIN-ANDA.vercel.app/api/cron/reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'baitulfadli_cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $$
);

-- Melihat riwayat:   select * from cron.job_run_details order by start_time desc limit 10;
-- Menghapus jadwal:  select cron.unschedule('baitulfadli-reminder-backup');
