-- =====================================================================
-- RPC / logika bisnis
-- =====================================================================

-- ---------------------------------------------------------------------
-- Email di profil (disalin dari auth.users, tidak bisa diubah via API)
-- ---------------------------------------------------------------------
alter table public.profiles add column email text;

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
  insert into public.profiles (id, full_name, phone, email)
  values (new.id, v_name, v_phone, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------
-- Helper periode donasi
-- ---------------------------------------------------------------------
create or replace function public.cycle_due_date(
  p_freq public.donation_frequency, p_dow smallint, p_dom smallint, p_day date
)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when p_freq = 'monthly' then
      make_date(extract(year from p_day)::int, extract(month from p_day)::int, p_dom)
    else
      (date_trunc('week', p_day)::date + (p_dow - 1))
  end;
$$;

create or replace function public.cycle_period_key(p_freq public.donation_frequency, p_day date)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_freq = 'monthly' then to_char(p_day, 'YYYY-MM')
    else to_char(p_day, 'IYYY-"W"IW')
  end;
$$;

-- Membuat tagihan periode yang sudah jatuh tempo (idempoten).
-- Dipanggil cron harian (service role) atau admin.
create or replace function public.generate_donation_periods(p_today date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, public.jakarta_today());
  v_count int;
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  with s as (
    select ds.id, ds.user_id, ds.amount, ds.started_at,
           public.cycle_due_date(ds.frequency, ds.day_of_week, ds.day_of_month, v_today) as due,
           public.cycle_period_key(ds.frequency, v_today) as pkey
    from public.donor_subscriptions ds
    where ds.status = 'active'
  ), ins as (
    insert into public.donation_periods (subscription_id, user_id, period_key, due_date, amount)
    select s.id, s.user_id, s.pkey, s.due, s.amount
    from s
    where v_today >= s.due and s.due >= s.started_at
    on conflict (subscription_id, period_key) do nothing
    returning 1
  )
  select count(*) into v_count from ins;

  -- Periode lama yang masih "Menunggu Pembayaran" menjadi "Belum Dibayar"
  -- bila sudah ada periode yang lebih baru, atau sudah lewat 35 hari.
  update public.donation_periods p
  set status = 'unpaid'
  where p.status = 'pending'
    and (
      p.due_date < v_today - 35
      or exists (
        select 1 from public.donation_periods n
        where n.subscription_id = p.subscription_id and n.due_date > p.due_date
      )
    );

  return v_count;
end;
$$;

-- Donatur mengonfirmasi sudah transfer.
create or replace function public.confirm_donation_payment(
  p_period_id uuid, p_note text default null, p_proof_path text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_period public.donation_periods%rowtype;
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
  if p_proof_path is not null and p_proof_path not like (v_uid::text || '/%') then
    raise exception 'INVALID_PROOF' using errcode = 'P0001';
  end if;
  if p_note is not null and char_length(p_note) > 300 then
    raise exception 'NOTE_TOO_LONG' using errcode = 'P0001';
  end if;

  update public.donation_periods
  set status = 'awaiting_verification',
      donor_note = nullif(trim(p_note), ''),
      proof_path = coalesce(p_proof_path, proof_path),
      donor_confirmed_at = now()
  where id = p_period_id;

  perform public.write_audit('confirm_payment', 'donation_periods', p_period_id::text,
    jsonb_build_object('from', v_period.status, 'to', 'awaiting_verification'));
end;
$$;

-- Admin mengubah status pembayaran (verifikasi manual).
-- Saat ditandai "paid" dan p_record_income = true, sistem membuat transaksi
-- pemasukan kategori "Donatur Tetap" secara otomatis (tanpa nama donatur
-- agar privasi terjaga di laporan publik).
create or replace function public.set_period_status(
  p_period_id uuid,
  p_status public.period_status,
  p_admin_note text default null,
  p_record_income boolean default true
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
    update public.donation_periods
    set status = 'paid', verified_by = auth.uid(), verified_at = now(),
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
      insert into public.transactions (type, category_id, amount, transaction_date, description, donation_period_id)
      values (
        'income', v_cat, v_period.amount, public.jakarta_today(),
        'Donasi donatur tetap ' || case when v_freq = 'weekly' then 'mingguan' else 'bulanan' end
          || ' periode ' || v_period.period_key,
        p_period_id
      );
    end if;
  else
    -- membatalkan status lunas: hapus transaksi otomatis yang terkait
    delete from public.transactions where donation_period_id = p_period_id;
    update public.donation_periods
    set status = p_status, verified_by = null, verified_at = null,
        admin_note = coalesce(nullif(trim(p_admin_note), ''), admin_note)
    where id = p_period_id;
  end if;

  perform public.write_audit('set_payment_status', 'donation_periods', p_period_id::text,
    jsonb_build_object('from', v_period.status, 'to', p_status, 'note', p_admin_note,
                       'record_income', p_record_income));
end;
$$;

-- ---------------------------------------------------------------------
-- Keuangan
-- ---------------------------------------------------------------------
create or replace function public.compute_finance_summary(p_start date, p_end date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with opening as (
    select coalesce(sum(case when type = 'income' then amount else -amount end), 0) as v
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
  )
  select jsonb_build_object(
    'opening_balance', opening.v,
    'total_income', period.income,
    'total_expense', period.expense,
    'closing_balance', opening.v + period.income - period.expense,
    'transaction_count', period.tx_count,
    'breakdown', breakdown.v
  )
  from opening, period, breakdown;
$$;

create or replace function public.finance_summary(p_start date, p_end date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return public.compute_finance_summary(p_start, p_end);
end;
$$;

create or replace function public.publish_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r public.financial_reports%rowtype;
  v_s jsonb;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select * into v_r from public.financial_reports where id = p_report_id for update;
  if not found then
    raise exception 'NOT_FOUND: Laporan tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_r.status <> 'draft' then
    raise exception 'INVALID_STATUS: Laporan sudah dipublikasikan.' using errcode = 'P0001';
  end if;
  if v_r.period_end > public.jakarta_today() then
    raise exception 'PERIOD_NOT_ENDED: Laporan hanya dapat dipublikasikan setelah periodenya berakhir.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.financial_reports r
    where r.status = 'published' and r.id <> v_r.id
      and r.period_start <= v_r.period_end and r.period_end >= v_r.period_start
  ) then
    raise exception 'OVERLAP: Periode bertumpang tindih dengan laporan lain yang sudah dipublikasikan.' using errcode = 'P0001';
  end if;

  v_s := public.compute_finance_summary(v_r.period_start, v_r.period_end);
  update public.financial_reports
  set status = 'published',
      opening_balance = (v_s ->> 'opening_balance')::numeric,
      total_income = (v_s ->> 'total_income')::numeric,
      total_expense = (v_s ->> 'total_expense')::numeric,
      closing_balance = (v_s ->> 'closing_balance')::numeric,
      breakdown = v_s -> 'breakdown',
      published_at = now(),
      published_by = auth.uid()
  where id = p_report_id;

  perform public.write_audit('publish_report', 'financial_reports', p_report_id::text, v_s - 'breakdown');
end;
$$;

create or replace function public.unpublish_report(p_report_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r public.financial_reports%rowtype;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 or char_length(p_reason) > 500 then
    raise exception 'REASON_REQUIRED: Alasan pembatalan wajib diisi (minimal 5 karakter).' using errcode = 'P0001';
  end if;
  select * into v_r from public.financial_reports where id = p_report_id for update;
  if not found or v_r.status <> 'published' then
    raise exception 'INVALID_STATUS: Laporan belum dipublikasikan.' using errcode = 'P0001';
  end if;

  update public.financial_reports
  set status = 'draft', opening_balance = null, total_income = null, total_expense = null,
      closing_balance = null, breakdown = null, published_at = null, published_by = null
  where id = p_report_id;

  perform public.write_audit('unpublish_report', 'financial_reports', p_report_id::text,
    jsonb_build_object('reason', trim(p_reason),
      'previous', jsonb_build_object('total_income', v_r.total_income, 'total_expense', v_r.total_expense,
                                     'closing_balance', v_r.closing_balance)));
end;
$$;

-- Transaksi publik: hanya transaksi yang masuk periode laporan terbit.
create or replace function public.get_public_report_transactions(p_report_id uuid)
returns table (
  id uuid, transaction_date date, type public.transaction_type,
  category_name text, amount numeric, description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.transaction_date, t.type, c.name, t.amount, t.description
  from public.financial_reports r
  join public.transactions t on t.transaction_date between r.period_start and r.period_end
  join public.categories c on c.id = t.category_id
  where r.id = p_report_id and r.status = 'published'
  order by t.transaction_date, t.created_at;
$$;

-- ---------------------------------------------------------------------
-- Dashboard admin
-- ---------------------------------------------------------------------
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := public.jakarta_today();
  v_month_start date := date_trunc('month', v_today)::date;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  with tx as (
    select
      coalesce(sum(case when type = 'income' then amount else -amount end), 0) as balance,
      coalesce(sum(amount) filter (where type = 'income'), 0) as income_all,
      coalesce(sum(amount) filter (where type = 'expense'), 0) as expense_all,
      coalesce(sum(amount) filter (where type = 'income' and transaction_date >= v_month_start), 0) as income_month,
      coalesce(sum(amount) filter (where type = 'expense' and transaction_date >= v_month_start), 0) as expense_month
    from public.transactions
  ), donors as (
    select ds.user_id,
      bool_and(p.status = 'paid') filter (where p.id is not null) as all_paid,
      count(p.id) as period_count
    from public.donor_subscriptions ds
    left join public.donation_periods p
      on p.subscription_id = ds.id and p.due_date >= v_month_start and p.due_date <= v_today
    where ds.status = 'active'
    group by ds.user_id
  )
  select jsonb_build_object(
    'balance', tx.balance,
    'income_all', tx.income_all,
    'expense_all', tx.expense_all,
    'income_month', tx.income_month,
    'expense_month', tx.expense_month,
    'active_donors', (select count(*) from donors),
    'donors_paid_month', (select count(*) from donors where period_count > 0 and all_paid),
    'donors_unpaid_month', (select count(*) from donors where period_count > 0 and not all_paid),
    'donors_not_due_month', (select count(*) from donors where period_count = 0),
    'awaiting_verification', (select count(*) from public.donation_periods where status = 'awaiting_verification'),
    'unpaid_total', (select count(*) from public.donation_periods where status in ('pending', 'unpaid'))
  ) into v_result
  from tx;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- Manajemen role (hanya admin; admin terakhir tidak bisa diturunkan)
-- ---------------------------------------------------------------------
create or replace function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.user_role;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select role into v_old from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_old = p_role then
    return;
  end if;
  if v_old = 'admin' and p_role <> 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'LAST_ADMIN: Tidak dapat menurunkan admin terakhir.' using errcode = 'P0001';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  perform public.write_audit('set_role', 'profiles', p_user_id::text,
    jsonb_build_object('from', v_old, 'to', p_role));
end;
$$;

-- ---------------------------------------------------------------------
-- Telegram
-- ---------------------------------------------------------------------
-- Dipanggil user login (server action) dengan HASH token; token mentah
-- tidak pernah disimpan.
create or replace function public.create_telegram_link_token(p_token_hash text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_expires timestamptz := now() + interval '15 minutes';
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_TOKEN' using errcode = 'P0001';
  end if;
  if (select count(*) from public.telegram_link_tokens
      where user_id = v_uid and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'RATE_LIMITED: Terlalu sering. Coba lagi beberapa menit lagi.' using errcode = 'P0001';
  end if;
  delete from public.telegram_link_tokens
  where user_id = v_uid and (used_at is not null or expires_at < now());
  insert into public.telegram_link_tokens (token_hash, user_id, expires_at)
  values (p_token_hash, v_uid, v_expires);
  return v_expires;
end;
$$;

-- Dipanggil webhook Telegram (service role).
create or replace function public.link_telegram_account(
  p_token_hash text, p_chat_id bigint, p_username text
)
returns table (user_id uuid, full_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  update public.telegram_link_tokens t
  set used_at = now()
  where t.token_hash = p_token_hash and t.used_at is null and t.expires_at > now()
  returning t.user_id into v_uid;

  if v_uid is null then
    return;
  end if;

  delete from public.telegram_links l where l.chat_id = p_chat_id and l.user_id <> v_uid;
  insert into public.telegram_links (user_id, chat_id, telegram_username)
  values (v_uid, p_chat_id, left(p_username, 64))
  on conflict on constraint telegram_links_pkey do update
    set chat_id = excluded.chat_id, telegram_username = excluded.telegram_username, linked_at = now();

  delete from public.telegram_link_tokens t where t.user_id = v_uid and t.token_hash <> p_token_hash;

  perform public.write_audit('telegram_linked', 'telegram_links', v_uid::text, '{}'::jsonb);

  return query select p.id, p.full_name from public.profiles p where p.id = v_uid;
end;
$$;

-- Kandidat reminder otomatis (service role).
create or replace function public.get_reminder_candidates(p_today date default null)
returns table (
  period_id uuid, user_id uuid, kind text, chat_id bigint, full_name text,
  amount numeric, period_key text, due_date date, frequency public.donation_frequency
)
language sql
stable
security definer
set search_path = ''
as $$
  with d as (select coalesce(p_today, public.jakarta_today()) as today)
  select p.id, p.user_id, k.kind, tl.chat_id, pr.full_name, p.amount, p.period_key, p.due_date, s.frequency
  from public.donation_periods p
  cross join d
  join public.donor_subscriptions s on s.id = p.subscription_id and s.status = 'active'
  join public.telegram_links tl on tl.user_id = p.user_id
  join public.profiles pr on pr.id = p.user_id
  cross join lateral (
    select case
      when p.due_date between d.today - 2 and d.today then 'due'
      when p.due_date between d.today - 6 and d.today - 3 then 'followup'
    end as kind
  ) k
  where p.status = 'pending'
    and k.kind is not null
    and not exists (
      select 1 from public.reminder_logs rl
      where rl.period_id = p.id and rl.kind = k.kind
        and (rl.status in ('sent', 'skipped')
             or rl.attempts >= 3
             or (rl.status = 'sending' and rl.updated_at > now() - interval '30 minutes'))
    )
  order by p.due_date
  limit 300;
$$;

-- Klaim slot reminder secara atomik (mencegah kirim ganda bila cron
-- berjalan paralel). Mengembalikan id log, atau null jika sudah diklaim.
create or replace function public.claim_reminder(p_period_id uuid, p_user_id uuid, p_kind text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if p_kind not in ('due', 'followup') then
    raise exception 'INVALID_KIND' using errcode = 'P0001';
  end if;
  insert into public.reminder_logs (period_id, user_id, kind)
  values (p_period_id, p_user_id, p_kind)
  on conflict (period_id, kind) where kind in ('due', 'followup')
  do update set status = 'sending', attempts = public.reminder_logs.attempts + 1,
                error = null, updated_at = now()
    where (public.reminder_logs.status = 'failed' and public.reminder_logs.attempts < 3)
       or (public.reminder_logs.status = 'sending' and public.reminder_logs.updated_at < now() - interval '30 minutes')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.finish_reminder(p_log_id bigint, p_status text, p_error text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.reminder_logs
  set status = p_status, error = left(p_error, 500), updated_at = now()
  where id = p_log_id;
$$;

-- ---------------------------------------------------------------------
-- Hak eksekusi fungsi
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from anon, authenticated, public;
grant execute on all functions in schema public to service_role;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.jakarta_today() to anon, authenticated;
grant execute on function public.get_public_report_transactions(uuid) to anon, authenticated;

grant execute on function public.generate_donation_periods(date) to authenticated;
grant execute on function public.confirm_donation_payment(uuid, text, text) to authenticated;
grant execute on function public.set_period_status(uuid, public.period_status, text, boolean) to authenticated;
grant execute on function public.finance_summary(date, date) to authenticated;
grant execute on function public.publish_report(uuid) to authenticated;
grant execute on function public.unpublish_report(uuid, text) to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;
grant execute on function public.create_telegram_link_token(text) to authenticated;
-- link_telegram_account, get_reminder_candidates, claim_reminder,
-- finish_reminder, compute_finance_summary: service_role saja.
