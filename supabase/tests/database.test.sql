-- Test keamanan (RLS/RBAC) dan logika bisnis. Jalankan: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(81);

-- ---------------------------------------------------------------------
-- Fixture: 3 user (admin, donatur A, donatur B)
-- ---------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'admin@test.local', '{"full_name":"Admin Masjid","phone":"081234567890"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'a@test.local', '{"full_name":"Donatur A","phone":"0812-3456-7891"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'b@test.local', '{"full_name":"Donatur B","phone":"invalid"}', now(), now());

update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111';

select is((select full_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'Donatur A', 'profil otomatis dibuat dari metadata');
select is((select phone from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  '081234567891', 'nomor HP dinormalisasi');
select is((select phone from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  null, 'nomor HP tidak valid diabaikan');
select is((select email from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'a@test.local', 'email disalin ke profil');

create or replace function pg_temp.login(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
end $$;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;
create or replace function pg_temp.as_service() returns void language plpgsql as $$
begin
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Profil & role
-- ---------------------------------------------------------------------
select pg_temp.login('22222222-2222-2222-2222-222222222222');
select throws_ok($$ update public.profiles set role = 'admin' where id = auth.uid() $$,
  '42501', null, 'user tidak bisa menaikkan role sendiri');
select lives_ok($$ update public.profiles set full_name = 'Donatur A Baru' where id = auth.uid() $$,
  'user bisa ubah nama sendiri');
select is((select count(*)::int from public.profiles), 1, 'user hanya melihat profil sendiri');
select is((select count(*)::int from public.profiles where id = '33333333-3333-3333-3333-333333333333'), 0,
  'user tidak melihat profil orang lain');
select throws_ok($$ select public.set_user_role('22222222-2222-2222-2222-222222222222', 'admin') $$,
  '42501', null, 'user tidak bisa memanggil set_user_role');
select throws_ok($$ select public.admin_dashboard_stats() $$, '42501', null, 'user tidak bisa akses statistik admin');
select is((select count(*)::int from public.transactions), 0, 'user tidak melihat transaksi');
select is((select count(*)::int from public.audit_logs), 0, 'user tidak melihat audit log');
reset role;

-- ---------------------------------------------------------------------
-- Admin: keuangan
-- ---------------------------------------------------------------------
select pg_temp.login('11111111-1111-1111-1111-111111111111');
select is((select count(*)::int from public.profiles), 3, 'admin melihat semua profil');
select lives_ok($$
  insert into public.transactions (type, category_id, amount, transaction_date, description)
  values ('income', (select id from public.categories where name = 'Infaq Jumat'), 500000, '2026-10-02', 'Infaq Jumat pekan 1'),
         ('expense', (select id from public.categories where name = 'Listrik & Air'), 150000, '2026-10-05', 'Bayar listrik Oktober'),
         ('income', (select id from public.categories where name = 'Kotak Amal'), 100000, '2026-09-20', 'Kotak amal September')
$$, 'admin bisa menambah transaksi');
select throws_ok($$
  insert into public.transactions (type, category_id, amount, transaction_date, description)
  values ('expense', (select id from public.categories where name = 'Infaq Jumat'), 1000, '2026-10-02', 'salah kategori')
$$, 'P0001', null, 'kategori harus sesuai jenis transaksi');
select throws_ok($$
  insert into public.transactions (type, category_id, amount, transaction_date, description)
  values ('income', (select id from public.categories where name = 'Infaq Jumat'), -5, '2026-10-02', 'negatif')
$$, '23514', null, 'nominal negatif ditolak');
select is((select (public.finance_summary('2026-10-01', '2026-10-31') ->> 'closing_balance')::numeric), 450000::numeric,
  'ringkasan: saldo akhir = saldo awal + masuk - keluar');
select is((select (public.finance_summary('2026-10-01', '2026-10-31') ->> 'opening_balance')::numeric), 100000::numeric,
  'ringkasan: saldo awal dihitung dari transaksi sebelumnya');

insert into public.financial_reports (title, period_start, period_end) values ('Laporan Oktober 2026', '2026-10-01', '2026-10-31');
insert into public.financial_reports (title, period_start, period_end) values ('Laporan Draft Nov', '2026-10-15', '2026-11-10');
select lives_ok($$ select public.publish_report((select id from public.financial_reports where title = 'Laporan Oktober 2026')) $$,
  'admin bisa mempublikasikan laporan');
select is((select total_income from public.financial_reports where title = 'Laporan Oktober 2026'), 500000::numeric,
  'snapshot pemasukan tersimpan');
select throws_ok($$ select public.publish_report((select id from public.financial_reports where title = 'Laporan Draft Nov')) $$,
  'P0001', null, 'periode tumpang tindih ditolak');
select throws_ok($$
  insert into public.transactions (type, category_id, amount, transaction_date, description)
  values ('income', (select id from public.categories where name = 'Infaq Jumat'), 1000, '2026-10-10', 'masuk periode terkunci')
$$, 'P0001', null, 'tidak bisa menambah transaksi di periode terkunci');
select throws_ok($$ update public.transactions set amount = 1 where description = 'Infaq Jumat pekan 1' $$,
  'P0001', null, 'tidak bisa mengubah transaksi di periode terkunci');
select throws_ok($$ delete from public.transactions where description = 'Bayar listrik Oktober' $$,
  'P0001', null, 'tidak bisa menghapus transaksi di periode terkunci');
select lives_ok($$ update public.financial_reports set title = 'Ubah' where title = 'Laporan Oktober 2026' $$,
  'update laporan terbit diabaikan oleh RLS');
reset role;

select is((select title from public.financial_reports where title like 'Laporan Okt%'), 'Laporan Oktober 2026',
  'judul laporan terbit tetap');

-- Publik
select pg_temp.as_anon();
select is((select count(*)::int from public.financial_reports), 1, 'publik hanya melihat laporan terbit');
select throws_ok($$ select * from public.get_public_report_transactions((select id from public.financial_reports limit 1)) $$,
  '42501', null, 'rincian transaksi tidak lagi terbuka untuk publik (laporan hanya ringkasan)');
select is((select count(*)::int from public.financial_reports where opening_balance is not null and closing_balance is not null), 1,
  'publik tetap melihat ringkasan saldo awal & akhir laporan terbit');
select throws_ok($$ select * from public.transactions $$, '42501', null, 'publik tidak bisa membaca tabel transaksi');
select throws_ok($$ select public.finance_summary('2026-01-01', '2026-12-31') $$, '42501', null,
  'publik tidak bisa memanggil RPC admin');
select throws_ok($$ select * from public.profiles $$, '42501', null, 'publik tidak bisa membaca profil');
select throws_ok($$ insert into public.events (title, event_date) values ('Hack', '2026-12-01') $$, '42501', null,
  'publik tidak bisa menambah agenda');
reset role;

select pg_temp.login('11111111-1111-1111-1111-111111111111');
select throws_ok($$ select public.unpublish_report((select id from public.financial_reports where status = 'published'), 'x') $$,
  'P0001', null, 'pembatalan publikasi wajib alasan');
select lives_ok($$ select public.unpublish_report((select id from public.financial_reports where status = 'published'), 'Ada koreksi nominal') $$,
  'admin bisa membatalkan publikasi dengan alasan');
select ok((select count(*) from public.audit_logs where action = 'unpublish_report') = 1, 'pembatalan tercatat di audit log');
select ok((select count(*) from public.audit_logs where entity = 'transactions') >= 3, 'perubahan transaksi tercatat di audit log');
insert into public.events (title, event_date, is_published) values ('Kajian Ahad', '2026-12-06', true), ('Rapat internal', '2026-12-07', false);
reset role;

select pg_temp.as_anon();
select is((select count(*)::int from public.events where title in ('Kajian Ahad', 'Rapat internal')), 1, 'publik hanya melihat agenda terbit');
reset role;

-- ---------------------------------------------------------------------
-- Donatur tetap
-- ---------------------------------------------------------------------
select pg_temp.login('22222222-2222-2222-2222-222222222222');
select throws_ok($$
  insert into public.donor_subscriptions (user_id, amount, frequency, day_of_month)
  values ('33333333-3333-3333-3333-333333333333', 50000, 'monthly', 10)
$$, '42501', null, 'tidak bisa mendaftarkan donasi atas nama orang lain');
select lives_ok($$
  insert into public.donor_subscriptions (user_id, amount, frequency, day_of_month)
  values (auth.uid(), 100000, 'monthly', 10)
$$, 'donatur bisa mendaftar donasi bulanan');
select throws_ok($$
  insert into public.donor_subscriptions (user_id, amount, frequency, day_of_week)
  values (auth.uid(), 100000, 'monthly', 3)
$$, '23514', null, 'jadwal tidak konsisten ditolak');
reset role;

-- mundurkan tanggal mulai agar periode bisa dibuat
update public.donor_subscriptions set started_at = '2026-01-01';
insert into public.donor_subscriptions (user_id, amount, frequency, day_of_week, started_at)
values ('33333333-3333-3333-3333-333333333333', 25000, 'weekly', 5, '2026-01-01');

select pg_temp.as_service();
select is(public.generate_donation_periods('2026-11-06'), 1, 'hanya donatur mingguan yang jatuh tempo (Jumat 6 Nov)');
select is(public.generate_donation_periods('2026-11-10'), 1, 'donatur bulanan jatuh tempo tanggal 10');
select is(public.generate_donation_periods('2026-11-10'), 0, 'generate ulang tidak menduplikasi tagihan');
select is((select due_date from public.donation_periods where period_key = '2026-W45'), '2026-11-06'::date,
  'jatuh tempo mingguan tepat (Jumat)');
select is(public.generate_donation_periods('2026-11-13'), 1, 'periode minggu berikutnya dibuat');
select is((select status::text from public.donation_periods where period_key = '2026-W45'), 'unpaid',
  'periode lama yang tidak dibayar menjadi Belum Dibayar');
reset role;

select pg_temp.login('33333333-3333-3333-3333-333333333333');
select throws_ok($$
  select public.confirm_donation_payment((select id from public.donation_periods
    where user_id = '22222222-2222-2222-2222-222222222222' limit 1), 'bukan punya saya')
$$, 'P0002', null, 'tidak bisa konfirmasi tagihan orang lain');
select is((select count(*)::int from public.donation_periods), 2, 'donatur hanya melihat tagihan sendiri');
reset role;

select pg_temp.login('22222222-2222-2222-2222-222222222222');
select lives_ok($$
  select public.confirm_donation_payment((select id from public.donation_periods where period_key = '2026-11'), 'Transfer BSI')
$$, 'donatur bisa konfirmasi pembayaran');
select is((select status::text from public.donation_periods where period_key = '2026-11'), 'awaiting_verification',
  'status menjadi Menunggu Verifikasi');
select throws_ok($$
  select public.set_period_status((select id from public.donation_periods where period_key = '2026-11'), 'paid')
$$, '42501', null, 'donatur tidak bisa memverifikasi sendiri');
reset role;

select pg_temp.login('11111111-1111-1111-1111-111111111111');
select lives_ok($$
  select public.set_period_status((select id from public.donation_periods where period_key = '2026-11'), 'paid', 'Sudah masuk rekening')
$$, 'admin bisa memverifikasi pembayaran');
select is((select count(*)::int from public.transactions t join public.donation_periods p on p.id = t.donation_period_id
  where p.period_key = '2026-11'), 1, 'verifikasi otomatis membuat transaksi pemasukan');
select lives_ok($$
  select public.set_period_status((select id from public.donation_periods where period_key = '2026-11'), 'pending', 'Salah verifikasi')
$$, 'admin bisa membatalkan status lunas');
select is((select count(*)::int from public.transactions where donation_period_id is not null), 0,
  'transaksi otomatis ikut dihapus saat status dibatalkan');
select throws_ok($$ select public.set_user_role('11111111-1111-1111-1111-111111111111', 'user') $$,
  'P0001', null, 'admin terakhir tidak bisa diturunkan');
reset role;

-- ---------------------------------------------------------------------
-- Telegram & reminder
-- ---------------------------------------------------------------------
select pg_temp.login('22222222-2222-2222-2222-222222222222');
select lives_ok($$ select public.create_telegram_link_token(repeat('a', 64)) $$, 'user bisa membuat token tautan');
select throws_ok($$ select * from public.telegram_link_tokens $$, '42501', null, 'token tidak bisa dibaca klien');
reset role;

select pg_temp.as_service();
select is((select count(*)::int from public.link_telegram_account(repeat('b', 64), 999, 'x')), 0, 'token salah ditolak');
select is((select full_name from public.link_telegram_account(repeat('a', 64), 12345, 'donaturA')), 'Donatur A Baru',
  'token benar menautkan akun');
select is((select count(*)::int from public.link_telegram_account(repeat('a', 64), 12345, 'donaturA')), 0,
  'token tidak bisa dipakai dua kali');
select is((select count(*)::int from public.get_reminder_candidates('2026-11-11')), 1, 'kandidat reminder ditemukan');
select isnt(public.claim_reminder((select id from public.donation_periods where period_key = '2026-11'),
  '22222222-2222-2222-2222-222222222222', 'due'), null, 'klaim reminder pertama berhasil');
select is(public.claim_reminder((select id from public.donation_periods where period_key = '2026-11'),
  '22222222-2222-2222-2222-222222222222', 'due'), null, 'klaim kedua ditolak (anti-duplikasi)');
reset role;

select pg_temp.login('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select chat_id from public.telegram_links $$, '42501', null, 'chat_id tidak diekspos ke klien');
select is((select telegram_username from public.telegram_links), 'donaturA', 'status tautan Telegram bisa dilihat');
reset role;

-- ---------------------------------------------------------------------
-- Autentikasi tanpa email: nomor HP & token reset
-- ---------------------------------------------------------------------
select is(public.normalize_phone('+62 812-3456-7890'), '081234567890', 'normalisasi +62');
select is(public.normalize_phone('6281234567890'), '081234567890', 'normalisasi 62');
select throws_ok($$ update public.profiles set phone = '+6281234567891' where id = '33333333-3333-3333-3333-333333333333' $$,
  '23505', null, 'nomor HP unik (format berbeda tetap terdeteksi)');
insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated',
  'c@test.local', '{"full_name":"Donatur C","phone":"+62 812 3456 7891"}', now(), now());
select is((select phone from public.profiles where id = '44444444-4444-4444-4444-444444444444'), null,
  'pendaftaran dgn HP duplikat tetap membuat profil tanpa HP');

insert into public.password_reset_tokens (token_hash, user_id, channel, expires_at)
values (repeat('c', 64), '22222222-2222-2222-2222-222222222222', 'telegram', now() + interval '30 minutes'),
       (repeat('d', 64), '22222222-2222-2222-2222-222222222222', 'telegram', now() - interval '1 minute');

select pg_temp.login('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select * from public.password_reset_tokens $$, '42501', null, 'token reset tidak bisa dibaca klien');
select throws_ok($$ select public.consume_password_reset_token(repeat('c', 64)) $$, '42501', null, 'klien tidak bisa memakai token langsung');
reset role;

select pg_temp.as_service();
select is(public.consume_password_reset_token(repeat('d', 64)), null, 'token kedaluwarsa ditolak');
select is(public.consume_password_reset_token(repeat('c', 64)), '22222222-2222-2222-2222-222222222222'::uuid, 'token valid dipakai');
select is(public.consume_password_reset_token(repeat('c', 64)), null, 'token reset sekali pakai');
select is((select count(*)::int from (select public.hit_rate_limit('t', 2, 60) as ok from generate_series(1, 3)) s where ok), 2,
  'rate limit membatasi percobaan');
reset role;

-- ---------------------------------------------------------------------
-- Laporan pekanan (Jumat–Kamis)
-- ---------------------------------------------------------------------
select pg_temp.as_service();
select isnt(public.create_weekly_report_draft('2026-12-04'), null, 'draf laporan pekan lalu dibuat otomatis');
select is(public.create_weekly_report_draft('2026-12-05'), null, 'draf pekanan tidak dobel (idempoten)');
select is((select period_start::text || '|' || period_end::text || '|' || title from public.financial_reports where title like 'Laporan Pekan%'),
  '2026-11-27|2026-12-03|Laporan Pekan 27 November – 3 Desember 2026', 'periode Jumat s/d Kamis & judul pekan benar');
reset role;
select pg_temp.login('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.create_weekly_report_draft('2026-12-11') $$, '42501', null, 'donatur tidak bisa membuat draf laporan');
reset role;

select * from finish();
rollback;
