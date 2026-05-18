begin;

alter table public.technicians enable row level security;

drop policy if exists "admins can insert technicians" on public.technicians;
create policy "admins can insert technicians"
on public.technicians
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

drop policy if exists "admins can update technicians" on public.technicians;
create policy "admins can update technicians"
on public.technicians
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
