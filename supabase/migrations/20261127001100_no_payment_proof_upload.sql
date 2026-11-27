-- Donatur tidak lagi mengunggah bukti transfer (hemat storage).
-- Tutup jalur unggah di storage; berkas lama tetap bisa dilihat admin/pemiliknya
-- dan tetap ikut terhapus saat akun dihapus.
drop policy if exists "payment-proofs owner insert" on storage.objects;
