begin;

drop policy if exists "admins_can_insert_activity_definitions" on public.activity_definitions;
create policy "admins_can_insert_activity_definitions"
  on public.activity_definitions
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

drop policy if exists "admins_can_update_activity_definitions" on public.activity_definitions;
create policy "admins_can_update_activity_definitions"
  on public.activity_definitions
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
