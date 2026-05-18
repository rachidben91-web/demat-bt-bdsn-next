begin;

drop policy if exists "admins_can_insert_support_days" on public.support_days;
create policy "admins_can_insert_support_days"
  on public.support_days
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()::text
        and user_roles.role = 'admin'
    )
  );

drop policy if exists "admins_can_insert_support_day_entries" on public.support_day_entries;
create policy "admins_can_insert_support_day_entries"
  on public.support_day_entries
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()::text
        and user_roles.role = 'admin'
    )
  );

commit;
