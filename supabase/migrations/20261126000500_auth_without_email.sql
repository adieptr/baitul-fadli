-- =====================================================================
-- Autentikasi tanpa ketergantungan email
--   * Nomor HP dinormalisasi (08xx) dan unik → bisa dipakai untuk login
--   * Token reset kata sandi via Telegram (hanya hash yang disimpan)
--   * Pembatas laju (rate limit) sederhana untuk pendaftaran & reset
-- =====================================================================

-- ---------------------------------------------------------------------
-- Normalisasi nomor HP: +62812… / 62812… / 0812-… → 0812…
-- ---------------------------------------------------------------------
create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when x = '' then null
    when x ~ '^\+?62' then '0' || regexp_replace(x, '^\+?62', '')
    else x
  end
  from (select regexp_replace(coalesce(p, ''), '[^0-9+]', '', 'g') as x) s;
$$;

update public.profiles set phone = public.normalize_phone(phone) where phone is not null;

-- Jika ada duplikat lama, pertahankan yang paling awal.
update public.profiles p set phone = null
where phone is not null and exists (
  select 1 from public.profiles q
  where q.phone = p.phone and (q.created_at, q.id) < (p.created_at, p.id)
);

alter table public.profiles drop constraint if exists profiles_phone_check;
alter table public.profiles add constraint profiles_phone_check
  check (phone is null or phone ~ '^0[0-9]{8,15}$');
create unique index profiles_phone_unique on public.profiles (phone) where phone is not null;

create or replace function public.profiles_normalize_phone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone := public.normalize_phone(new.phone);
  return new;
end;
$$;

create trigger profiles_normalize_phone
  before insert or update of phone on public.profiles
  for each row execute function public.profiles_normalize_phone();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(coalesce(trim(new.raw_user_meta_data ->> 'full_name'), ''), 120);
  v_phone text := public.normalize_phone(new.raw_user_meta_data ->> 'phone');
begin
  if v_phone is not null and v_phone !~ '^0[0-9]{8,15}$' then
    v_phone := null;
  end if;
  begin
    insert into public.profiles (id, full_name, phone, email)
    values (new.id, v_name, v_phone, new.email)
    on conflict (id) do nothing;
  exception when unique_violation then
    -- nomor HP sudah dipakai akun lain: tetap buat profil tanpa nomor HP
    insert into public.profiles (id, full_name, phone, email)
    values (new.id, v_name, null, new.email)
    on conflict (id) do nothing;
  end;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Token reset kata sandi (server only)
-- ---------------------------------------------------------------------
create table public.password_reset_tokens (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('telegram', 'admin')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index password_reset_tokens_user_idx on public.password_reset_tokens (user_id);
alter table public.password_reset_tokens enable row level security;
-- tidak ada grant untuk anon/authenticated

-- Pakai token secara atomik; mengembalikan user_id atau null.
create or replace function public.consume_password_reset_token(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  update public.password_reset_tokens
  set used_at = now()
  where token_hash = p_token_hash and used_at is null and expires_at > now()
  returning user_id into v_uid;
  if v_uid is not null then
    -- batalkan token lain milik user yang sama
    update public.password_reset_tokens set used_at = now()
    where user_id = v_uid and used_at is null;
    insert into public.audit_logs (actor_id, action, entity, entity_id, details)
    values (null, 'password_reset', 'profiles', v_uid::text, '{"channel":"telegram"}'::jsonb);
  end if;
  return v_uid;
end;
$$;

-- ---------------------------------------------------------------------
-- Rate limit sederhana (kunci berupa hash IP / identitas, bukan data mentah)
-- ---------------------------------------------------------------------
create table public.rate_limits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index rate_limits_key_idx on public.rate_limits (key, created_at desc);
alter table public.rate_limits enable row level security;

-- true = boleh lanjut (dan percobaan dicatat), false = melebihi batas.
create or replace function public.hit_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  delete from public.rate_limits where created_at < now() - interval '1 day';
  select count(*) into v_count from public.rate_limits
  where key = p_key and created_at > now() - make_interval(secs => p_window_seconds);
  if v_count >= p_max then
    return false;
  end if;
  insert into public.rate_limits (key) values (p_key);
  return true;
end;
$$;

revoke execute on function public.normalize_phone(text) from anon, authenticated, public;
revoke execute on function public.profiles_normalize_phone() from anon, authenticated, public;
revoke execute on function public.consume_password_reset_token(text) from anon, authenticated, public;
revoke execute on function public.hit_rate_limit(text, int, int) from anon, authenticated, public;
grant execute on function public.normalize_phone(text) to service_role, authenticated;
grant execute on function public.consume_password_reset_token(text) to service_role;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
grant all on public.password_reset_tokens, public.rate_limits to service_role;
