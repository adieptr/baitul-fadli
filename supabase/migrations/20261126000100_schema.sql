-- =====================================================================
-- Masjid Baitul Fadli — Skema inti
-- Prinsip:
--   * Semua tabel di schema public memakai RLS + GRANT eksplisit (deny by default).
--   * Operasi bernilai bisnis (publikasi laporan, verifikasi pembayaran,
--     generate tagihan) lewat fungsi SECURITY DEFINER yang memeriksa role.
--   * Zona waktu bisnis: Asia/Jakarta.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------
create type public.user_role as enum ('admin', 'user');
create type public.transaction_type as enum ('income', 'expense');
create type public.report_status as enum ('draft', 'published');
create type public.donation_frequency as enum ('weekly', 'monthly');
create type public.subscription_status as enum ('active', 'paused', 'stopped');
-- pending               = Menunggu Pembayaran (periode berjalan)
-- awaiting_verification = Menunggu Verifikasi (donatur sudah konfirmasi transfer)
-- paid                  = Sudah Dibayar (diverifikasi admin)
-- unpaid                = Belum Dibayar (periode lewat tanpa pembayaran)
create type public.period_status as enum ('pending', 'awaiting_verification', 'paid', 'unpaid');

-- ---------------------------------------------------------------------
-- Helper umum
-- ---------------------------------------------------------------------
create or replace function public.jakarta_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Profil pengguna (1:1 dengan auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (phone is null or phone ~ '^\+?[0-9]{8,16}$'),
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cek admin. SECURITY DEFINER agar tidak rekursif terhadap RLS profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Buat profil otomatis saat user mendaftar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(coalesce(trim(new.raw_user_meta_data ->> 'full_name'), ''), 120);
  v_phone text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9+]', '', 'g');
begin
  if v_phone !~ '^\+?[0-9]{8,16}$' then
    v_phone := null;
  end if;
  insert into public.profiles (id, full_name, phone)
  values (new.id, v_name, v_phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Audit log (aktivitas penting + riwayat perubahan data keuangan)
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create or replace function public.write_audit(
  p_action text, p_entity text, p_entity_id text, p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  -- actor bisa null (proses sistem / service role)
  if v_actor is not null and not exists (select 1 from public.profiles where id = v_actor) then
    v_actor := null;
  end if;
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
end;
$$;

-- Trigger audit generik: menyimpan data lama & baru.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text;
  v_details jsonb;
begin
  if tg_op = 'DELETE' then
    v_id := (to_jsonb(old) ->> 'id');
    v_details := jsonb_build_object('old', to_jsonb(old));
  elsif tg_op = 'UPDATE' then
    if to_jsonb(new) - 'updated_at' = to_jsonb(old) - 'updated_at' then
      return new; -- tidak ada perubahan berarti
    end if;
    v_id := (to_jsonb(new) ->> 'id');
    v_details := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  else
    v_id := (to_jsonb(new) ->> 'id');
    v_details := jsonb_build_object('new', to_jsonb(new));
  end if;
  perform public.write_audit(lower(tg_op), tg_table_name, v_id, v_details);
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------
-- Pengaturan situs (profil masjid, kontak, info pembayaran) — 1 baris
-- ---------------------------------------------------------------------
create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  mosque_name text not null default 'Masjid Baitul Fadli' check (char_length(mosque_name) <= 120),
  tagline text not null default '' check (char_length(tagline) <= 200),
  welcome_message text not null default '' check (char_length(welcome_message) <= 2000),
  history text not null default '' check (char_length(history) <= 5000),
  vision text not null default '' check (char_length(vision) <= 2000),
  mission text not null default '' check (char_length(mission) <= 3000),
  address text not null default '' check (char_length(address) <= 500),
  phone text not null default '' check (char_length(phone) <= 30),
  whatsapp text not null default '' check (char_length(whatsapp) <= 30),
  email text not null default '' check (char_length(email) <= 120),
  maps_url text not null default '' check (maps_url = '' or maps_url ~ '^https://'),
  payment_info text not null default '' check (char_length(payment_info) <= 2000),
  updated_at timestamptz not null default now()
);
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Program donasi (informasi publik)
-- ---------------------------------------------------------------------
create table public.donation_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 3000),
  target_amount numeric(14, 2) check (target_amount is null or target_amount > 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger donation_programs_updated_at before update on public.donation_programs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Keuangan
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  type public.transaction_type not null,
  is_active boolean not null default true,
  is_system boolean not null default false, -- dipakai otomatis oleh sistem
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, type)
);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.financial_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 150),
  period_start date not null,
  period_end date not null,
  notes text not null default '' check (char_length(notes) <= 3000),
  status public.report_status not null default 'draft',
  -- snapshot dihitung saat publikasi
  opening_balance numeric(16, 2),
  total_income numeric(16, 2),
  total_expense numeric(16, 2),
  closing_balance numeric(16, 2),
  breakdown jsonb,
  published_at timestamptz,
  published_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (period_end - period_start <= 366)
);
create index financial_reports_status_idx on public.financial_reports (status, period_end desc);
create trigger financial_reports_updated_at before update on public.financial_reports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Donatur tetap
-- ---------------------------------------------------------------------
create table public.donor_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  amount numeric(14, 2) not null check (amount >= 1000 and amount <= 1000000000),
  frequency public.donation_frequency not null,
  day_of_week smallint check (day_of_week between 1 and 7),   -- ISO: 1 = Senin
  day_of_month smallint check (day_of_month between 1 and 28),
  status public.subscription_status not null default 'active',
  started_at date not null default public.jakarta_today(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (frequency = 'weekly' and day_of_week is not null and day_of_month is null)
    or (frequency = 'monthly' and day_of_month is not null and day_of_week is null)
  )
);
create index donor_subscriptions_status_idx on public.donor_subscriptions (status);
create trigger donor_subscriptions_updated_at before update on public.donor_subscriptions
  for each row execute function public.set_updated_at();

create table public.donation_periods (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.donor_subscriptions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_key text not null check (period_key ~ '^[0-9]{4}-(W[0-9]{2}|[0-9]{2})$'),
  due_date date not null,
  amount numeric(14, 2) not null check (amount > 0),
  status public.period_status not null default 'pending',
  donor_note text check (donor_note is null or char_length(donor_note) <= 300),
  proof_path text,
  donor_confirmed_at timestamptz,
  admin_note text check (admin_note is null or char_length(admin_note) <= 300),
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- kunci anti-duplikasi tagihan
  unique (subscription_id, period_key)
);
create index donation_periods_status_idx on public.donation_periods (status, due_date);
create index donation_periods_user_idx on public.donation_periods (user_id, due_date desc);
create trigger donation_periods_updated_at before update on public.donation_periods
  for each row execute function public.set_updated_at();

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  type public.transaction_type not null,
  category_id uuid not null references public.categories (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0 and amount <= 100000000000),
  transaction_date date not null,
  description text not null check (char_length(description) between 3 and 500),
  proof_path text,
  donation_period_id uuid unique references public.donation_periods (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transactions_date_idx on public.transactions (transaction_date desc);
create index transactions_category_idx on public.transactions (category_id);

create or replace function public.transactions_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cat_type public.transaction_type;
begin
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

create trigger transactions_before_write
  before insert or update or delete on public.transactions
  for each row execute function public.transactions_before_write();

-- ---------------------------------------------------------------------
-- Agenda kegiatan
-- ---------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 150),
  description text not null default '' check (char_length(description) <= 5000),
  event_date date not null,
  start_time time,
  end_time time,
  location text not null default '' check (char_length(location) <= 200),
  image_path text,
  is_published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time is null or start_time is null or end_time >= start_time)
);
create index events_date_idx on public.events (is_published, event_date);
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Telegram
-- ---------------------------------------------------------------------
create table public.telegram_links (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  chat_id bigint not null unique,
  telegram_username text,
  linked_at timestamptz not null default now()
);

-- Token sekali pakai untuk menautkan akun (yang disimpan hanya hash SHA-256).
create table public.telegram_link_tokens (
  token_hash text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index telegram_link_tokens_user_idx on public.telegram_link_tokens (user_id);

create table public.reminder_logs (
  id bigint generated always as identity primary key,
  period_id uuid not null references public.donation_periods (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('due', 'followup', 'manual')),
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed', 'skipped')),
  attempts int not null default 1,
  error text,
  sent_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- kunci anti-duplikasi reminder otomatis: satu jenis per periode
create unique index reminder_logs_auto_unique on public.reminder_logs (period_id, kind)
  where kind in ('due', 'followup');
create index reminder_logs_period_idx on public.reminder_logs (period_id, created_at desc);

-- ---------------------------------------------------------------------
-- Trigger audit pada tabel yang dikelola admin
-- ---------------------------------------------------------------------
create trigger audit_transactions after insert or update or delete on public.transactions
  for each row execute function public.audit_row_change();
create trigger audit_categories after insert or update or delete on public.categories
  for each row execute function public.audit_row_change();
create trigger audit_financial_reports after insert or update or delete on public.financial_reports
  for each row execute function public.audit_row_change();
create trigger audit_events after insert or update or delete on public.events
  for each row execute function public.audit_row_change();
create trigger audit_donation_programs after insert or update or delete on public.donation_programs
  for each row execute function public.audit_row_change();
create trigger audit_site_settings after update on public.site_settings
  for each row execute function public.audit_row_change();
create trigger audit_donor_subscriptions after insert or update or delete on public.donor_subscriptions
  for each row execute function public.audit_row_change();
