-- =====================================================================
-- Sumber dana (Kas Tunai / Bank BSI), buku besar, nominal donasi fleksibel
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Akun sumber dana
-- ---------------------------------------------------------------------
create table public.fund_accounts (
  id text primary key check (id ~ '^[a-z_]{2,20}$'),
  name text not null check (char_length(name) between 2 and 60),
  -- saldo awal sebelum pencatatan di aplikasi dimulai
  opening_balance numeric(16, 2) not null default 0 check (opening_balance >= 0),
  sort_order smallint not null default 0
);
insert into public.fund_accounts (id, name, sort_order) values
  ('cash', 'Kas Tunai', 1),
  ('bsi', 'Bank BSI', 2);

alter table public.fund_accounts enable row level security;
grant select on public.fund_accounts to authenticated;
create policy fund_accounts_admin_select on public.fund_accounts
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 2) Transaksi & tagihan donasi mengenal akun sumber dana
-- ---------------------------------------------------------------------
alter table public.transactions
  add column account_id text not null default 'cash' references public.fund_accounts (id);
create index transactions_account_idx on public.transactions (account_id, transaction_date);

grant insert (account_id) on public.transactions to authenticated;
grant update (account_id) on public.transactions to authenticated;

-- Nominal & cara bayar yang DIKONFIRMASI donatur (boleh berbeda dari tagihan).
alter table public.donation_periods
  add column paid_amount numeric(14, 2) check (paid_amount is null or (paid_amount >= 1000 and paid_amount <= 1000000000)),
  add column paid_account text references public.fund_accounts (id);

-- ---------------------------------------------------------------------
-- 3) Kategori pemasukan tambahan
-- ---------------------------------------------------------------------
insert into public.categories (name, type, is_system, sort_order) values
  ('Shodaqoh', 'income', false, 2),
  ('Wakaf', 'income', false, 5)
on conflict (name, type) do nothing;

-- ---------------------------------------------------------------------
-- 4) Donatur mengonfirmasi pembayaran (nominal & cara bayar boleh berbeda)
-- ---------------------------------------------------------------------
drop function if exists public.confirm_donation_payment(uuid, text, text);
create or replace function public.confirm_donation_payment(
  p_period_id uuid,
  p_note text default null,
  p_amount numeric default null,
  p_account text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_period public.donation_periods%rowtype;
  v_amount numeric;
  v_account text := coalesce(p_account, 'bsi');
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  select * into v_period from public.donation_periods where id = p_period_id for update;
  if not found or v_period.user_id <> v_uid then
    raise exception 'NOT_FOUND: Tagihan tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_period.status not in ('pending', 'unpaid') then
    raise exception 'INVALID_STATUS: Tagihan ini sudah dikonfirmasi atau sudah lunas.' using errcode = 'P0001';
  end if;
  if p_note is not null and char_length(p_note) > 300 then
    raise exception 'NOTE_TOO_LONG' using errcode = 'P0001';
  end if;
  v_amount := coalesce(p_amount, v_period.amount);
  if v_amount < 1000 or v_amount > 1000000000 then
    raise exception 'INVALID_AMOUNT: Nominal donasi tidak valid (minimal Rp 1.000).' using errcode = 'P0001';
  end if;
  if v_account not in ('cash', 'bsi') then
    raise exception 'INVALID_ACCOUNT: Cara pembayaran tidak dikenal.' using errcode = 'P0001';
  end if;

  update public.donation_periods
  set status = 'awaiting_verification',
      donor_note = nullif(trim(p_note), ''),
      paid_amount = v_amount,
      paid_account = v_account,
      donor_confirmed_at = now()
  where id = p_period_id;

  perform public.write_audit('confirm_payment', 'donation_periods', p_period_id::text,
    jsonb_build_object('from', v_period.status, 'to', 'awaiting_verification',
                       'billed', v_period.amount, 'paid', v_amount, 'account', v_account));
end;
$$;

-- ---------------------------------------------------------------------
-- 5) Admin memverifikasi: nominal akhir & akun dapat disesuaikan
-- ---------------------------------------------------------------------
drop function if exists public.set_period_status(uuid, public.period_status, text, boolean);
create or replace function public.set_period_status(
  p_period_id uuid,
  p_status public.period_status,
  p_admin_note text default null,
  p_record_income boolean default true,
  p_amount numeric default null,
  p_account text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period public.donation_periods%rowtype;
  v_cat uuid;
  v_freq public.donation_frequency;
  v_amount numeric;
  v_account text;
  v_diff text := '';
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_admin_note is not null and char_length(p_admin_note) > 300 then
    raise exception 'NOTE_TOO_LONG' using errcode = 'P0001';
  end if;

  select * into v_period from public.donation_periods where id = p_period_id for update;
  if not found then
    raise exception 'NOT_FOUND: Tagihan tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_period.status = p_status then
    return;
  end if;

  if p_status = 'paid' then
    v_amount := coalesce(p_amount, v_period.paid_amount, v_period.amount);
    v_account := coalesce(p_account, v_period.paid_account, 'bsi');
    if v_amount < 1000 or v_amount > 1000000000 then
      raise exception 'INVALID_AMOUNT: Nominal tidak valid (minimal Rp 1.000).' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.fund_accounts where id = v_account) then
      raise exception 'INVALID_ACCOUNT: Akun sumber dana tidak dikenal.' using errcode = 'P0001';
    end if;

    update public.donation_periods
    set status = 'paid', verified_by = auth.uid(), verified_at = now(),
        paid_amount = v_amount, paid_account = v_account,
        admin_note = coalesce(nullif(trim(p_admin_note), ''), admin_note)
    where id = p_period_id;

    if p_record_income and not exists (
      select 1 from public.transactions where donation_period_id = p_period_id
    ) then
      select id into v_cat from public.categories
      where is_system and type = 'income' order by sort_order limit 1;
      if v_cat is null then
        raise exception 'SYSTEM_CATEGORY_MISSING' using errcode = 'P0001';
      end if;
      select frequency into v_freq from public.donor_subscriptions where id = v_period.subscription_id;
      if v_amount > v_period.amount then v_diff := ' (lebih dari tagihan)';
      elsif v_amount < v_period.amount then v_diff := ' (kurang dari tagihan)';
      end if;
      insert into public.transactions (type, category_id, amount, transaction_date, description, donation_period_id, account_id)
      values (
        'income', v_cat, v_amount, public.jakarta_today(),
        'Donasi donatur tetap ' || case when v_freq = 'weekly' then 'mingguan' else 'bulanan' end
          || ' periode ' || v_period.period_key || v_diff,
        p_period_id, v_account
      );
    end if;
  else
    -- membatalkan status lunas: hapus transaksi otomatis yang terkait
    delete from public.transactions where donation_period_id = p_period_id;
    update public.donation_periods
    set status = p_status, verified_by = null, verified_at = null,
        paid_amount = null, paid_account = null,
        admin_note = coalesce(nullif(trim(p_admin_note), ''), admin_note)
    where id = p_period_id;
  end if;

  perform public.write_audit('set_payment_status', 'donation_periods', p_period_id::text,
    jsonb_build_object('from', v_period.status, 'to', p_status, 'note', p_admin_note,
                       'record_income', p_record_income, 'amount', v_amount, 'account', v_account));
end;
$$;

-- ---------------------------------------------------------------------
-- 6) Ringkasan keuangan: saldo awal mencakup saldo awal akun; ada rincian per akun
-- ---------------------------------------------------------------------
create or replace function public.compute_finance_summary(p_start date, p_end date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with opening as (
    select (select coalesce(sum(opening_balance), 0) from public.fund_accounts)
      + coalesce(sum(case when type = 'income' then amount else -amount end), 0) as v
    from public.transactions where transaction_date < p_start
  ), period as (
    select
      coalesce(sum(amount) filter (where type = 'income'), 0) as income,
      coalesce(sum(amount) filter (where type = 'expense'), 0) as expense,
      count(*) as tx_count
    from public.transactions where transaction_date between p_start and p_end
  ), breakdown as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'category', b.name, 'type', b.type, 'total', b.total, 'count', b.cnt
    ) order by b.type, b.total desc), '[]'::jsonb) as v
    from (
      select c.name, t.type, sum(t.amount) as total, count(*) as cnt
      from public.transactions t join public.categories c on c.id = t.category_id
      where t.transaction_date between p_start and p_end
      group by c.name, t.type
    ) b
  ), by_account as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'account', a.id, 'name', a.name,
      'opening_balance', a.opening_balance + a.before_net,
      'income', a.income, 'expense', a.expense,
      'closing_balance', a.opening_balance + a.before_net + a.income - a.expense
    ) order by a.sort_order), '[]'::jsonb) as v
    from (
      select f.id, f.name, f.opening_balance, f.sort_order,
        coalesce(sum(case when t.transaction_date < p_start then (case when t.type = 'income' then t.amount else -t.amount end) end), 0) as before_net,
        coalesce(sum(t.amount) filter (where t.type = 'income' and t.transaction_date between p_start and p_end), 0) as income,
        coalesce(sum(t.amount) filter (where t.type = 'expense' and t.transaction_date between p_start and p_end), 0) as expense
      from public.fund_accounts f
      left join public.transactions t on t.account_id = f.id
      group by f.id, f.name, f.opening_balance, f.sort_order
    ) a
  ), matrix as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'account', m.account_id, 'category', m.name, 'type', m.type, 'total', m.total, 'count', m.cnt
    ) order by m.type, m.account_id, m.total desc), '[]'::jsonb) as v
    from (
      select t.account_id, c.name, t.type, sum(t.amount) as total, count(*) as cnt
      from public.transactions t join public.categories c on c.id = t.category_id
      where t.transaction_date between p_start and p_end
      group by t.account_id, c.name, t.type
    ) m
  )
  select jsonb_build_object(
    'opening_balance', opening.v,
    'total_income', period.income,
    'total_expense', period.expense,
    'closing_balance', opening.v + period.income - period.expense,
    'transaction_count', period.tx_count,
    'breakdown', breakdown.v,
    'by_account', by_account.v,
    'matrix', matrix.v
  )
  from opening, period, breakdown, by_account, matrix;
$$;

-- ---------------------------------------------------------------------
-- 7) Buku besar (admin): mutasi + saldo berjalan per akun / gabungan
-- ---------------------------------------------------------------------
create or replace function public.ledger_opening_balance(p_start date, p_account text default null)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return (select coalesce(sum(opening_balance), 0) from public.fund_accounts where p_account is null or id = p_account)
    + (select coalesce(sum(case when type = 'income' then amount else -amount end), 0)
       from public.transactions
       where transaction_date < p_start and (p_account is null or account_id = p_account));
end;
$$;

create or replace function public.get_ledger(p_start date, p_end date, p_account text default null)
returns table (
  id uuid,
  transaction_date date,
  created_at timestamptz,
  account_id text,
  type public.transaction_type,
  category_name text,
  description text,
  income numeric,
  expense numeric,
  balance numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_open numeric;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_end < p_start or p_end - p_start > 366 then
    raise exception 'INVALID_RANGE: Rentang tanggal tidak valid (maksimal 1 tahun).' using errcode = 'P0001';
  end if;
  v_open := public.ledger_opening_balance(p_start, p_account);
  return query
  select t.id, t.transaction_date, t.created_at, t.account_id, t.type, c.name, t.description,
    case when t.type = 'income' then t.amount else 0::numeric end,
    case when t.type = 'expense' then t.amount else 0::numeric end,
    v_open + sum(case when t.type = 'income' then t.amount else -t.amount end)
      over (order by t.transaction_date, t.created_at, t.id rows unbounded preceding)
  from public.transactions t
  join public.categories c on c.id = t.category_id
  where t.transaction_date between p_start and p_end
    and (p_account is null or t.account_id = p_account)
  order by t.transaction_date, t.created_at, t.id
  limit 5000;
end;
$$;

-- Saldo semua akun pada saat ini (dasbor admin)
create or replace function public.get_account_balances()
returns table (id text, name text, balance numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
  select f.id, f.name,
    f.opening_balance + coalesce(sum(case when t.type = 'income' then t.amount else -t.amount end), 0)
  from public.fund_accounts f
  left join public.transactions t on t.account_id = f.id
  group by f.id, f.name, f.opening_balance, f.sort_order
  order by f.sort_order;
end;
$$;

-- Saldo awal pencatatan: hanya boleh diubah sebelum ada laporan terbit.
create or replace function public.set_account_opening(p_account text, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old numeric;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_amount is null or p_amount < 0 or p_amount > 100000000000 then
    raise exception 'INVALID_AMOUNT: Saldo awal tidak valid.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.financial_reports where status = 'published') then
    raise exception 'OPENING_LOCKED: Saldo awal tidak dapat diubah karena sudah ada laporan yang dipublikasikan.' using errcode = 'P0001';
  end if;
  select opening_balance into v_old from public.fund_accounts where id = p_account for update;
  if not found then
    raise exception 'NOT_FOUND: Akun tidak ditemukan.' using errcode = 'P0002';
  end if;
  update public.fund_accounts set opening_balance = p_amount where id = p_account;
  perform public.write_audit('set_opening_balance', 'fund_accounts', p_account,
    jsonb_build_object('from', v_old, 'to', p_amount));
end;
$$;

-- ---------------------------------------------------------------------
-- 8) Hak eksekusi
-- ---------------------------------------------------------------------
revoke execute on function public.confirm_donation_payment(uuid, text, numeric, text) from anon, authenticated, public;
revoke execute on function public.set_period_status(uuid, public.period_status, text, boolean, numeric, text) from anon, authenticated, public;
revoke execute on function public.compute_finance_summary(date, date) from anon, authenticated, public;
revoke execute on function public.ledger_opening_balance(date, text) from anon, authenticated, public;
revoke execute on function public.get_ledger(date, date, text) from anon, authenticated, public;
revoke execute on function public.get_account_balances() from anon, authenticated, public;
revoke execute on function public.set_account_opening(text, numeric) from anon, authenticated, public;

grant execute on function public.confirm_donation_payment(uuid, text, numeric, text) to authenticated, service_role;
grant execute on function public.set_period_status(uuid, public.period_status, text, boolean, numeric, text) to authenticated, service_role;
grant execute on function public.compute_finance_summary(date, date) to service_role;
grant execute on function public.ledger_opening_balance(date, text) to authenticated, service_role;
grant execute on function public.get_ledger(date, date, text) to authenticated, service_role;
grant execute on function public.get_account_balances() to authenticated, service_role;
grant execute on function public.set_account_opening(text, numeric) to authenticated, service_role;
