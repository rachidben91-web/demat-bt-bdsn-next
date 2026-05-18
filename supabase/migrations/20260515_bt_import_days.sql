begin;

create table if not exists public.bt_import_days (
  id uuid primary key default gen_random_uuid(),
  day_date date not null,
  site_code text not null default 'VLG',
  source_pdf_name text not null,
  page_count integer not null default 0 check (page_count >= 0),
  bt_count integer not null default 0 check (bt_count >= 0),
  imported_by_email text,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (day_date, site_code)
);

create index if not exists bt_import_days_day_date_idx
  on public.bt_import_days (day_date desc);

create table if not exists public.bt_import_entries (
  id uuid primary key default gen_random_uuid(),
  import_day_id uuid not null references public.bt_import_days(id) on delete cascade,
  bt_id text not null,
  page_start integer not null check (page_start >= 1),
  objet text not null default '',
  date_prevue text not null default '',
  client text not null default '',
  localisation text not null default '',
  at_num text not null default '',
  designation text not null default '',
  duree text not null default '',
  analyse_des_risques text not null default '',
  observations text not null default '',
  team jsonb not null default '[]'::jsonb,
  docs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (import_day_id, bt_id, page_start)
);

create index if not exists bt_import_entries_day_page_idx
  on public.bt_import_entries (import_day_id, page_start asc);

alter table public.bt_import_days enable row level security;
alter table public.bt_import_entries enable row level security;

drop policy if exists "bt import days read for office support users" on public.bt_import_days;
create policy "bt import days read for office support users"
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
      and office_module_access.module_key = 'support_journee'
      and office_module_access.permission_level in ('read', 'write')
  )
);

drop policy if exists "bt import days write for office support users" on public.bt_import_days;
create policy "bt import days write for office support users"
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
      and office_module_access.module_key = 'support_journee'
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
      and office_module_access.module_key = 'support_journee'
      and office_module_access.permission_level = 'write'
  )
);

drop policy if exists "bt import entries read for office support users" on public.bt_import_entries;
create policy "bt import entries read for office support users"
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
      and office_module_access.module_key = 'support_journee'
      and office_module_access.permission_level in ('read', 'write')
  )
);

drop policy if exists "bt import entries write for office support users" on public.bt_import_entries;
create policy "bt import entries write for office support users"
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
      and office_module_access.module_key = 'support_journee'
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
      and office_module_access.module_key = 'support_journee'
      and office_module_access.permission_level = 'write'
  )
);

commit;
