-- Data contoh untuk pengembangan lokal (npx supabase db reset). Tidak dipakai di produksi.
insert into public.donation_programs (title, description, target_amount, sort_order) values
  ('Operasional Masjid', 'Listrik, air, kebersihan, dan honor petugas masjid.', null, 0),
  ('Renovasi Tempat Wudhu', 'Perbaikan dan perluasan tempat wudhu jamaah putra dan putri.', 75000000, 1);

update public.site_settings set
  address = 'Jl. Contoh No. 1, Kota Contoh',
  phone = '0211234567',
  whatsapp = '081234567890',
  email = 'info@baitulfadli.test',
  payment_info = 'Bank Syariah Indonesia (BSI)
No. Rek: 1234567890
a.n. Masjid Baitul Fadli'
where id = 1;
