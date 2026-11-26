-- =====================================================================
-- Row Level Security & GRANT eksplisit
-- Model: deny-by-default. Role Postgres yang dipakai Supabase:
--   anon          = pengunjung tanpa login
--   authenticated = user login (role aplikasi ditentukan kolom profiles.role)
--   service_role  = server (cron, webhook Telegram) — melewati RLS
-- =====================================================================

-- Cabut semua hak default dari role API, lalu berikan seperlunya.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from anon, authenticated, public;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated, public;

-- service_role tetap punya akses penuh (dipakai server saja).
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Aktifkan RLS di semua tabel.
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.site_settings enable row level security;
alter table public.donation_programs enable row level security;
alter table public.categories enable row level security;
alter table public.financial_reports enable row level security;
alter table public.donor_subscriptions enable row level security;
alter table public.donation_periods enable row level security;
alter table public.transactions enable row level security;
alter table public.events enable row level security;
alter table public.telegram_links enable row level security;
alter table public.telegram_link_tokens enable row level security;
alter table public.reminder_logs enable row level security;

-- Fungsi helper yang boleh dipanggil dari policy / klien
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.jakarta_today() to anon, authenticated;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
grant select on public.profiles to authenticated;
-- user hanya boleh mengubah nama & nomor HP; kolom role TIDAK bisa diubah lewat API.
grant update (full_name, phone) on public.profiles to authenticated;

create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- audit_logs — hanya admin yang membaca; penulisan via trigger/fungsi.
-- ---------------------------------------------------------------------
grant select on public.audit_logs to authenticated;
create policy audit_logs_admin_select on public.audit_logs
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- site_settings — publik membaca, admin mengubah.
-- ---------------------------------------------------------------------
grant select on public.site_settings to anon, authenticated;
grant update (
  mosque_name, tagline, welcome_message, history, vision, mission,
  address, phone, whatsapp, email, maps_url, payment_info
) on public.site_settings to authenticated;

create policy site_settings_public_select on public.site_settings
  for select to anon, authenticated using (true);
create policy site_settings_admin_update on public.site_settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- donation_programs
-- ---------------------------------------------------------------------
grant select on public.donation_programs to anon, authenticated;
grant insert, update, delete on public.donation_programs to authenticated;

create policy donation_programs_public_select on public.donation_programs
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy donation_programs_admin_insert on public.donation_programs
  for insert to authenticated with check ((select public.is_admin()));
create policy donation_programs_admin_update on public.donation_programs
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy donation_programs_admin_delete on public.donation_programs
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- categories — nama kategori tampil di laporan publik.
-- ---------------------------------------------------------------------
grant select on public.categories to anon, authenticated;
grant insert (name, type, is_active, sort_order) on public.categories to authenticated;
grant update (name, is_active, sort_order) on public.categories to authenticated;
grant delete on public.categories to authenticated;

create policy categories_public_select on public.categories
  for select to anon, authenticated using (true);
create policy categories_admin_insert on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy categories_admin_update on public.categories
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy categories_admin_delete on public.categories
  for delete to authenticated using ((select public.is_admin()) and not is_system);

-- ---------------------------------------------------------------------
-- financial_reports — publik hanya melihat yang sudah dipublikasikan.
-- Publikasi/pembatalan HANYA lewat RPC (snapshot dihitung server).
-- ---------------------------------------------------------------------
grant select on public.financial_reports to anon, authenticated;
grant insert (title, period_start, period_end, notes) on public.financial_reports to authenticated;
grant update (title, period_start, period_end, notes) on public.financial_reports to authenticated;
grant delete on public.financial_reports to authenticated;

create policy financial_reports_select on public.financial_reports
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));
create policy financial_reports_admin_insert on public.financial_reports
  for insert to authenticated
  with check ((select public.is_admin()) and status = 'draft');
create policy financial_reports_admin_update_draft on public.financial_reports
  for update to authenticated
  using ((select public.is_admin()) and status = 'draft')
  with check ((select public.is_admin()) and status = 'draft');
create policy financial_reports_admin_delete_draft on public.financial_reports
  for delete to authenticated
  using ((select public.is_admin()) and status = 'draft');

-- ---------------------------------------------------------------------
-- transactions — hanya admin (publik membaca lewat RPC laporan terbit).
-- ---------------------------------------------------------------------
grant select on public.transactions to authenticated;
grant insert (type, category_id, amount, transaction_date, description, proof_path)
  on public.transactions to authenticated;
grant update (type, category_id, amount, transaction_date, description, proof_path)
  on public.transactions to authenticated;
grant delete on public.transactions to authenticated;

create policy transactions_admin_select on public.transactions
  for select to authenticated using ((select public.is_admin()));
create policy transactions_admin_insert on public.transactions
  for insert to authenticated with check ((select public.is_admin()));
create policy transactions_admin_update on public.transactions
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy transactions_admin_delete on public.transactions
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------
grant select on public.events to anon, authenticated;
grant insert (title, description, event_date, start_time, end_time, location, image_path, is_published)
  on public.events to authenticated;
grant update (title, description, event_date, start_time, end_time, location, image_path, is_published)
  on public.events to authenticated;
grant delete on public.events to authenticated;

create policy events_public_select on public.events
  for select to anon, authenticated
  using (is_published or (select public.is_admin()));
create policy events_admin_insert on public.events
  for insert to authenticated with check ((select public.is_admin()));
create policy events_admin_update on public.events
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy events_admin_delete on public.events
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- donor_subscriptions — donatur mengelola miliknya sendiri; admin melihat
-- semua dan boleh mengubah status.
-- ---------------------------------------------------------------------
grant select on public.donor_subscriptions to authenticated;
grant insert (user_id, amount, frequency, day_of_week, day_of_month)
  on public.donor_subscriptions to authenticated;
grant update (amount, frequency, day_of_week, day_of_month, status)
  on public.donor_subscriptions to authenticated;

create policy donor_subscriptions_select on public.donor_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy donor_subscriptions_insert_own on public.donor_subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy donor_subscriptions_update on public.donor_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------
-- donation_periods — baca milik sendiri / admin; perubahan status via RPC.
-- ---------------------------------------------------------------------
grant select on public.donation_periods to authenticated;
create policy donation_periods_select on public.donation_periods
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------
-- telegram_links — chat_id TIDAK diekspos ke klien (column grant).
-- ---------------------------------------------------------------------
grant select (user_id, telegram_username, linked_at) on public.telegram_links to authenticated;
grant delete on public.telegram_links to authenticated;
create policy telegram_links_select on public.telegram_links
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy telegram_links_delete_own on public.telegram_links
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- telegram_link_tokens: tidak ada grant ke anon/authenticated (server only).

-- ---------------------------------------------------------------------
-- reminder_logs — admin membaca; ditulis server.
-- ---------------------------------------------------------------------
grant select on public.reminder_logs to authenticated;
create policy reminder_logs_admin_select on public.reminder_logs
  for select to authenticated using ((select public.is_admin()));
