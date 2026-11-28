-- =====================================================================
-- Donasi sukarela (shodaqoh / infaq / wakaf) di luar tagihan donasi tetap
-- Donatur mengirim, admin memverifikasi → otomatis jadi transaksi pemasukan.
-- =====================================================================

-- Kategori mana yang boleh dipilih donatur (diatur admin)
alter table public.categories add column donor_selectable boolean not null default false;
update public.categories set donor_selectable = true
where type = 'income' and name in ('Shodaqoh', 'Wakaf', 'Zakat, Infaq & Sedekah', 'Donasi Program');
grant update (donor_selectable) on public.categories to authenticated;

create table public.voluntary_donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  amount numeric(14, 2) not null check (amount >= 1000 and amount <= 1000000000),
  account_id text not null references public.fund_accounts (id),
  donor_note text check (donor_note is null or char_length(donor_note) <= 300),
  status text not null default 'awaiting_verification'
    check (status in ('awaiting_verification', 'verified', 'rejected')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 300),
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index voluntary_donations_user_idx on public.voluntary_donations (user_id, created_at desc);
create index voluntary_donations_status_idx on public.voluntary_donations (status, created_at);

alter table public.voluntary_donations enable row level security;
grant select on public.voluntary_donations to authenticated;
create policy voluntary_donations_select on public.voluntary_donations
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

alter table public.transactions
  add column voluntary_donation_id uuid unique references public.voluntary_donations (id) on delete set null;

-- Penghapusan akun: pengosongan tautan voluntary_donation_id juga diizinkan
-- (transaksi tetap utuh, hanya tanpa tautan ke donatur).
create or replace function public.transactions_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cat_type public.transaction_type;
  v_ref_cols constant text[] := array['donation_period_id', 'voluntary_donation_id', 'created_by', 'updated_by'];
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - v_ref_cols - 'updated_at') = (to_jsonb(old) - v_ref_cols - 'updated_at')
     and (new.donation_period_id is null or new.donation_period_id = old.donation_period_id)
     and (new.voluntary_donation_id is null or new.voluntary_donation_id = old.voluntary_donation_id)
     and (new.created_by is null or new.created_by = old.created_by)
     and (new.updated_by is null or new.updated_by = old.updated_by)
  then
    return new;
  end if;

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

-- ---------------------------------------------------------------------
-- Donatur mengirim donasi sukarela
-- ---------------------------------------------------------------------
create or replace function public.submit_voluntary_donation(
  p_category_id uuid,
  p_amount numeric,
  p_account text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  if p_amount is null or p_amount < 1000 or p_amount > 1000000000 then
    raise exception 'INVALID_AMOUNT: Nominal tidak valid (minimal Rp 1.000).' using errcode = 'P0001';
  end if;
  if p_account not in ('cash', 'bsi') then
    raise exception 'INVALID_ACCOUNT: Cara pembayaran tidak dikenal.' using errcode = 'P0001';
  end if;
  if p_note is not null and char_length(p_note) > 300 then
    raise exception 'NOTE_TOO_LONG: Catatan maksimal 300 karakter.' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.categories
    where id = p_category_id and type = 'income' and is_active and donor_selectable
  ) then
    raise exception 'INVALID_CATEGORY: Pilih jenis donasi yang tersedia.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.voluntary_donations
      where user_id = v_uid and status = 'awaiting_verification') >= 5 then
    raise exception 'TOO_MANY: Masih ada 5 donasi yang menunggu verifikasi pengurus. Mohon tunggu hingga diverifikasi.' using errcode = 'P0001';
  end if;

  insert into public.voluntary_donations (user_id, category_id, amount, account_id, donor_note)
  values (v_uid, p_category_id, p_amount, p_account, nullif(trim(p_note), ''))
  returning id into v_id;

  perform public.write_audit('voluntary_submitted', 'voluntary_donations', v_id::text,
    jsonb_build_object('amount', p_amount, 'account', p_account, 'category_id', p_category_id));
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Admin memverifikasi / menolak / mengembalikan ke menunggu
-- ---------------------------------------------------------------------
create or replace function public.set_voluntary_status(
  p_id uuid,
  p_status text,
  p_note text default null,
  p_amount numeric default null,
  p_account text default null,
  p_category uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.voluntary_donations%rowtype;
  v_amount numeric;
  v_account text;
  v_cat uuid;
  v_cat_name text;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_status not in ('awaiting_verification', 'verified', 'rejected') then
    raise exception 'INVALID_STATUS: Status tidak dikenal.' using errcode = 'P0001';
  end if;
  if p_note is not null and char_length(p_note) > 300 then
    raise exception 'NOTE_TOO_LONG: Catatan maksimal 300 karakter.' using errcode = 'P0001';
  end if;
  select * into v from public.voluntary_donations where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND: Donasi tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v.status = p_status then
    return;
  end if;

  if p_status = 'verified' then
    v_amount := coalesce(p_amount, v.amount);
    v_account := coalesce(p_account, v.account_id);
    v_cat := coalesce(p_category, v.category_id);
    if v_amount < 1000 or v_amount > 1000000000 then
      raise exception 'INVALID_AMOUNT: Nominal tidak valid (minimal Rp 1.000).' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.fund_accounts where id = v_account) then
      raise exception 'INVALID_ACCOUNT: Akun sumber dana tidak dikenal.' using errcode = 'P0001';
    end if;
    select name into v_cat_name from public.categories where id = v_cat and type = 'income';
    if v_cat_name is null then
      raise exception 'INVALID_CATEGORY: Kategori pemasukan tidak valid.' using errcode = 'P0001';
    end if;

    update public.voluntary_donations
    set status = 'verified', amount = v_amount, account_id = v_account, category_id = v_cat,
        verified_by = auth.uid(), verified_at = now(),
        admin_note = coalesce(nullif(trim(p_note), ''), admin_note)
    where id = p_id;

    if not exists (select 1 from public.transactions where voluntary_donation_id = p_id) then
      insert into public.transactions (type, category_id, amount, transaction_date, description, account_id, voluntary_donation_id)
      values ('income', v_cat, v_amount, public.jakarta_today(), 'Donasi sukarela: ' || v_cat_name, v_account, p_id);
    end if;
  else
    delete from public.transactions where voluntary_donation_id = p_id;
    update public.voluntary_donations
    set status = p_status, verified_by = null, verified_at = null,
        admin_note = coalesce(nullif(trim(p_note), ''), admin_note)
    where id = p_id;
  end if;

  perform public.write_audit('set_voluntary_status', 'voluntary_donations', p_id::text,
    jsonb_build_object('from', v.status, 'to', p_status, 'note', p_note, 'amount', v_amount, 'account', v_account));
end;
$$;

revoke execute on function public.submit_voluntary_donation(uuid, numeric, text, text) from anon, authenticated, public;
revoke execute on function public.set_voluntary_status(uuid, text, text, numeric, text, uuid) from anon, authenticated, public;
grant execute on function public.submit_voluntary_donation(uuid, numeric, text, text) to authenticated, service_role;
grant execute on function public.set_voluntary_status(uuid, text, text, numeric, text, uuid) to authenticated, service_role;
