-- ============================================================================
-- DEMAT-BT V2 - Support Journee dev anon read
-- Permet de lire les donnees avec la publishable key sans login pendant le dev
-- ============================================================================

begin;

drop policy if exists "anon_can_read_managers_dev" on public.managers;
create policy "anon_can_read_managers_dev"
  on public.managers
  for select
  to anon
  using (true);

drop policy if exists "anon_can_read_technicians_dev" on public.technicians;
create policy "anon_can_read_technicians_dev"
  on public.technicians
  for select
  to anon
  using (true);

drop policy if exists "anon_can_read_activities_dev" on public.activity_definitions;
create policy "anon_can_read_activities_dev"
  on public.activity_definitions
  for select
  to anon
  using (true);

drop policy if exists "anon_can_read_support_days_dev" on public.support_days;
create policy "anon_can_read_support_days_dev"
  on public.support_days
  for select
  to anon
  using (true);

drop policy if exists "anon_can_read_support_day_entries_dev" on public.support_day_entries;
create policy "anon_can_read_support_day_entries_dev"
  on public.support_day_entries
  for select
  to anon
  using (true);

drop policy if exists "anon_can_read_support_day_entry_history_dev" on public.support_day_entry_history;
create policy "anon_can_read_support_day_entry_history_dev"
  on public.support_day_entry_history
  for select
  to anon
  using (true);

commit;
