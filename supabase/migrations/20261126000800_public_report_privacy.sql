-- =====================================================================
-- Privasi donatur di laporan publik:
-- rincian per transaksi yang dapat diakses publik HANYA pengeluaran.
-- Pemasukan tampil sebagai total per kategori (kolom breakdown laporan).
-- =====================================================================
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
  where r.id = p_report_id
    and r.status = 'published'
    and t.type = 'expense'
  order by t.transaction_date, t.created_at;
$$;
