begin;

drop policy if exists "admins_can_insert_support_day_entry_history" on public.support_day_entry_history;
create policy "admins_can_insert_support_day_entry_history"
  on public.support_day_entry_history
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
