begin;

alter table public.managers enable row level security;
alter table public.activity_definitions enable row level security;
alter table public.support_days enable row level security;
alter table public.support_day_entries enable row level security;
alter table public.support_day_entry_history enable row level security;

drop policy if exists "authenticated_can_read_managers" on public.managers;
create policy "authenticated_can_read_managers"
  on public.managers
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_can_read_technicians" on public.technicians;
create policy "authenticated_can_read_technicians"
  on public.technicians
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_can_read_activity_definitions" on public.activity_definitions;
create policy "authenticated_can_read_activity_definitions"
  on public.activity_definitions
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_can_read_support_days" on public.support_days;
create policy "authenticated_can_read_support_days"
  on public.support_days
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_can_read_support_day_entries" on public.support_day_entries;
create policy "authenticated_can_read_support_day_entries"
  on public.support_day_entries
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_can_read_support_day_entry_history" on public.support_day_entry_history;
create policy "authenticated_can_read_support_day_entry_history"
  on public.support_day_entry_history
  for select
  to authenticated
  using (true);

drop policy if exists "admins_can_update_support_days" on public.support_days;
create policy "admins_can_update_support_days"
  on public.support_days
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()::text
        and user_roles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()::text
        and user_roles.role = 'admin'
    )
  );

drop policy if exists "admins_can_update_support_day_entries" on public.support_day_entries;
create policy "admins_can_update_support_day_entries"
  on public.support_day_entries
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()::text
        and user_roles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()::text
        and user_roles.role = 'admin'
    )
  );

commit;
