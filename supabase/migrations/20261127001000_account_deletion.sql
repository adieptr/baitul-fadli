-- =====================================================================
-- Dukungan hapus akun (UU PDP): saat akun dihapus, transaksi keuangan masjid
-- TETAP tersimpan; hanya tautannya ke donatur/pengguna yang dikosongkan
-- (FK "on delete set null"). Kunci periode tutup buku tidak boleh
-- menghalangi pengosongan tautan ini, tetapi tetap menolak perubahan isi.
-- =====================================================================
create or replace function public.transactions_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cat_type public.transaction_type;
  v_ref_cols constant text[] := array['donation_period_id', 'created_by', 'updated_by'];
begin
  -- Pengecualian sempit: UPDATE yang HANYA mengosongkan kolom referensi
  -- (akibat akun/tagihan dihapus). Nilai keuangan tidak berubah sama sekali.
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - v_ref_cols - 'updated_at') = (to_jsonb(old) - v_ref_cols - 'updated_at')
     and (new.donation_period_id is null or new.donation_period_id = old.donation_period_id)
     and (new.created_by is null or new.created_by = old.created_by)
     and (new.updated_by is null or new.updated_by = old.updated_by)
  then
    return new;
  end if;

  -- Kunci periode: transaksi dalam periode laporan yang sudah dipublikasikan
  -- tidak boleh dibuat/diubah/dihapus (tutup buku).
  if tg_op in ('UPDATE', 'DELETE') and exists (
    select 1 from public.financial_reports r
    where r.status = 'published' and old.transaction_date between r.period_start and r.period_end
  ) then
    raise exception 'PERIOD_LOCKED: Transaksi berada pada periode laporan yang sudah dipublikasikan.'
      using errcode = 'P0001';
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    if exists (
      select 1 from public.financial_reports r
      where r.status = 'published' and new.transaction_date between r.period_start and r.period_end
    ) then
      raise exception 'PERIOD_LOCKED: Tanggal transaksi berada pada periode laporan yang sudah dipublikasikan.'
        using errcode = 'P0001';
    end if;
    select type into v_cat_type from public.categories where id = new.category_id;
    if v_cat_type is distinct from new.type then
      raise exception 'CATEGORY_MISMATCH: Kategori tidak sesuai dengan jenis transaksi.'
        using errcode = 'P0001';
    end if;
    if tg_op = 'UPDATE' then
      new.updated_at := now();
      new.updated_by := coalesce(auth.uid(), old.updated_by);
      new.created_by := old.created_by;
      new.created_at := old.created_at;
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
