-- =====================================================================
-- Storage bucket + kebijakan akses, dan data awal wajib
-- =====================================================================

-- public-media      : gambar agenda (publik baca, admin tulis)
-- transaction-proofs: bukti transaksi keuangan (privat, admin saja)
-- payment-proofs    : bukti transfer donatur (privat; donatur di folder
--                     miliknya sendiri, admin baca semua)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-media', 'public-media', true, 3145728, array['image/jpeg', 'image/png', 'image/webp']),
  ('transaction-proofs', 'transaction-proofs', false, 3145728,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('payment-proofs', 'payment-proofs', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "public-media admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'public-media' and (select public.is_admin()));
create policy "public-media admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'public-media' and (select public.is_admin()));
create policy "public-media admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'public-media' and (select public.is_admin()));

create policy "transaction-proofs admin select" on storage.objects
  for select to authenticated
  using (bucket_id = 'transaction-proofs' and (select public.is_admin()));
create policy "transaction-proofs admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'transaction-proofs' and (select public.is_admin()));
create policy "transaction-proofs admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'transaction-proofs' and (select public.is_admin()));

create policy "payment-proofs owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "payment-proofs owner or admin select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

-- ---------------------------------------------------------------------
-- Data awal
-- ---------------------------------------------------------------------
insert into public.site_settings (id, mosque_name, tagline, welcome_message, history, vision, mission, payment_info)
values (
  1,
  'Masjid Baitul Fadli',
  'Memakmurkan masjid, mempererat ukhuwah',
  'Assalamu''alaikum warahmatullahi wabarakatuh. Selamat datang di website resmi Masjid Baitul Fadli. Di sini Bapak/Ibu dapat melihat agenda kegiatan, laporan keuangan masjid secara terbuka, dan bergabung menjadi donatur tetap.',
  'Silakan lengkapi sejarah singkat masjid melalui menu Admin → Pengaturan.',
  'Menjadi masjid yang makmur, amanah, dan bermanfaat bagi umat.',
  'Menyelenggarakan ibadah dengan tertib dan nyaman
Mengelola keuangan masjid secara transparan dan amanah
Menghidupkan kegiatan dakwah, pendidikan, dan sosial',
  'Silakan lengkapi informasi rekening masjid melalui menu Admin → Pengaturan.'
)
on conflict (id) do nothing;

insert into public.categories (name, type, is_system, sort_order) values
  ('Donatur Tetap', 'income', true, 0),
  ('Infaq Jumat', 'income', false, 1),
  ('Kotak Amal', 'income', false, 2),
  ('Zakat, Infaq & Sedekah', 'income', false, 3),
  ('Donasi Program', 'income', false, 4),
  ('Lain-lain (Pemasukan)', 'income', false, 9),
  ('Listrik & Air', 'expense', false, 1),
  ('Kebersihan & Perawatan', 'expense', false, 2),
  ('Honor Imam/Khatib/Marbot', 'expense', false, 3),
  ('Kegiatan Dakwah', 'expense', false, 4),
  ('Pembangunan & Renovasi', 'expense', false, 5),
  ('Sosial & Santunan', 'expense', false, 6),
  ('Lain-lain (Pengeluaran)', 'expense', false, 9)
on conflict (name, type) do nothing;
