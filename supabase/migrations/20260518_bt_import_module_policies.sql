begin;

drop policy if exists "bt import days read for office module users" on public.bt_import_days;
drop policy if exists "bt import days read for office support users" on public.bt_import_days;
create policy "bt import days read for office module users"
on public.bt_import_days
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
  or exists (
    select 1
    from public.office_accounts
    join public.office_module_access
      on office_module_access.office_account_id = office_accounts.id
    where office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_office_app = true
      and office_module_access.module_key in ('support_journee', 'referent', 'brief', 'import_pdf')
      and office_module_access.permission_level in ('read', 'write')
  )
);

drop policy if exists "bt import days write for office module users" on public.bt_import_days;
drop policy if exists "bt import days write for office support users" on public.bt_import_days;
create policy "bt import days write for office module users"
on public.bt_import_days
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
  or exists (
    select 1
    from public.office_accounts
    join public.office_module_access
      on office_module_access.office_account_id = office_accounts.id
    where office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_office_app = true
      and office_module_access.module_key = 'import_pdf'
      and office_module_access.permission_level = 'write'
  )
)
with check (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
  or exists (
    select 1
    from public.office_accounts
    join public.office_module_access
      on office_module_access.office_account_id = office_accounts.id
    where office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_office_app = true
      and office_module_access.module_key = 'import_pdf'
      and office_module_access.permission_level = 'write'
  )
);

drop policy if exists "bt import entries read for office module users" on public.bt_import_entries;
drop policy if exists "bt import entries read for office support users" on public.bt_import_entries;
create policy "bt import entries read for office module users"
on public.bt_import_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
  or exists (
    select 1
    from public.office_accounts
    join public.office_module_access
      on office_module_access.office_account_id = office_accounts.id
    where office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_office_app = true
      and office_module_access.module_key in ('support_journee', 'referent', 'brief', 'import_pdf')
      and office_module_access.permission_level in ('read', 'write')
  )
);

drop policy if exists "bt import entries write for office module users" on public.bt_import_entries;
drop policy if exists "bt import entries write for office support users" on public.bt_import_entries;
create policy "bt import entries write for office module users"
on public.bt_import_entries
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
  or exists (
    select 1
    from public.office_accounts
    join public.office_module_access
      on office_module_access.office_account_id = office_accounts.id
    where office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_office_app = true
      and office_module_access.module_key = 'import_pdf'
      and office_module_access.permission_level = 'write'
  )
)
with check (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
  or exists (
    select 1
    from public.office_accounts
    join public.office_module_access
      on office_module_access.office_account_id = office_accounts.id
    where office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_office_app = true
      and office_module_access.module_key = 'import_pdf'
      and office_module_access.permission_level = 'write'
  )
);

drop policy if exists "bt import pdfs read for office module users" on storage.objects;
drop policy if exists "bt import pdfs read for support users" on storage.objects;
create policy "bt import pdfs read for office module users"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bt-import-pdfs'
  and (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()::text
        and user_roles.role = 'admin'
    )
    or exists (
      select 1
      from public.office_accounts
      join public.office_module_access
        on office_module_access.office_account_id = office_accounts.id
      where office_accounts.auth_user_id = auth.uid()
        and office_accounts.account_status = 'active'
        and office_accounts.can_access_office_app = true
        and office_module_access.module_key in ('support_journee', 'referent', 'brief', 'import_pdf')
        and office_module_access.permission_level in ('read', 'write')
    )
  )
);

drop policy if exists "bt import pdfs write for office module users" on storage.objects;
drop policy if exists "bt import pdfs write for support users" on storage.objects;
create policy "bt import pdfs write for office module users"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'bt-import-pdfs'
  and (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()::text
        and user_roles.role = 'admin'
    )
    or exists (
      select 1
      from public.office_accounts
      join public.office_module_access
        on office_module_access.office_account_id = office_accounts.id
      where office_accounts.auth_user_id = auth.uid()
        and office_accounts.account_status = 'active'
        and office_accounts.can_access_office_app = true
        and office_module_access.module_key = 'import_pdf'
        and office_module_access.permission_level = 'write'
    )
  )
)
with check (
  bucket_id = 'bt-import-pdfs'
  and (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()::text
        and user_roles.role = 'admin'
    )
    or exists (
      select 1
      from public.office_accounts
      join public.office_module_access
        on office_module_access.office_account_id = office_accounts.id
      where office_accounts.auth_user_id = auth.uid()
        and office_accounts.account_status = 'active'
        and office_accounts.can_access_office_app = true
        and office_module_access.module_key = 'import_pdf'
        and office_module_access.permission_level = 'write'
    )
  )
);

commit;
