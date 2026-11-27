-- =====================================================================
-- Laporan keuangan pekanan (Jumat s/d Kamis) + laporan publik hanya ringkasan
-- =====================================================================

-- Pekan terakhir yang sudah selesai (Jumat–Kamis) relatif terhadap p_today.
create or replace function public.last_completed_week(p_today date)
returns table (week_start date, week_end date)
language sql
immutable
set search_path = ''
as $$
  -- Kamis terakhir yang sudah lewat (sebelum hari ini); isodow Kamis = 4
  select (e - 6)::date, e
  from (select (p_today - 1 - ((extract(isodow from p_today - 1)::int - 4 + 7) % 7))::date as e) x;
$$;

create or replace function public.week_report_title(p_start date, p_end date)
returns text
language sql
immutable
set search_path = ''
as $$
  with m(n) as (
    select array['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  )
  select 'Laporan Pekan ' ||
    case
      when extract(month from p_start) = extract(month from p_end) then
        extract(day from p_start)::int || '–' || extract(day from p_end)::int || ' ' ||
        (select n[extract(month from p_end)::int] from m) || ' ' || extract(year from p_end)::int
      else
        extract(day from p_start)::int || ' ' || (select n[extract(month from p_start)::int] from m) || ' – ' ||
        extract(day from p_end)::int || ' ' || (select n[extract(month from p_end)::int] from m) || ' ' || extract(year from p_end)::int
    end;
$$;

-- Membuat draf laporan pekan lalu bila belum ada (idempoten).
-- Dipanggil cron harian (service role) atau admin. Mengembalikan id draf baru, atau null.
create or replace function public.create_weekly_report_draft(p_today date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, public.jakarta_today());
  v_start date;
  v_end date;
  v_id uuid;
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select w.week_start, w.week_end into v_start, v_end from public.last_completed_week(v_today) w;

  -- Jangan buat bila sudah ada laporan untuk pekan itu, atau periode itu sudah
  -- tercakup laporan lain yang terbit.
  if exists (
    select 1 from public.financial_reports r
    where (r.period_start = v_start and r.period_end = v_end)
       or (r.status = 'published' and r.period_start <= v_end and r.period_end >= v_start)
  ) then
    return null;
  end if;

  insert into public.financial_reports (title, period_start, period_end, notes)
  values (public.week_report_title(v_start, v_end), v_start, v_end, '')
  returning id into v_id;
  return v_id;
end;
$$;

-- Laporan publik kini hanya ringkasan: rincian transaksi tidak lagi dibuka untuk publik.
revoke execute on function public.get_public_report_transactions(uuid) from anon, authenticated;

revoke execute on function public.last_completed_week(date) from anon, authenticated, public;
revoke execute on function public.week_report_title(date, date) from anon, authenticated, public;
revoke execute on function public.create_weekly_report_draft(date) from anon, authenticated, public;
grant execute on function public.last_completed_week(date) to service_role, authenticated;
grant execute on function public.week_report_title(date, date) to service_role, authenticated;
grant execute on function public.create_weekly_report_draft(date) to service_role, authenticated;
