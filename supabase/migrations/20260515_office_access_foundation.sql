begin;

create table if not exists public.office_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null,
  email text unique not null,
  full_name text not null,
  technician_id uuid references public.technicians(id) on delete set null,
  account_status text not null default 'active' check (
    account_status in ('active', 'inactive', 'suspended')
  ),
  first_login boolean not null default true,
  password_changed boolean not null default false,
  can_access_office_app boolean not null default true,
  can_access_terrain_app boolean not null default false,
  office_role text check (
    office_role in ('admin', 'manager', 'team_lead', 'viewer')
  ),
  terrain_role text check (
    terrain_role in ('technician', 'senior_technician')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists office_accounts_technician_id_unique
  on public.office_accounts (technician_id)
  where technician_id is not null;

create table if not exists public.office_module_access (
  id uuid primary key default gen_random_uuid(),
  office_account_id uuid not null references public.office_accounts(id) on delete cascade,
  module_key text not null,
  permission_level text not null check (
    permission_level in ('none', 'read', 'write')
  ),
  created_at timestamptz not null default now(),
  unique (office_account_id, module_key)
);

alter table public.office_accounts enable row level security;
alter table public.office_module_access enable row level security;

drop policy if exists "admins can read office accounts" on public.office_accounts;
create policy "admins can read office accounts"
on public.office_accounts
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
);

drop policy if exists "admins can insert office accounts" on public.office_accounts;
create policy "admins can insert office accounts"
on public.office_accounts
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

drop policy if exists "admins can update office accounts" on public.office_accounts;
create policy "admins can update office accounts"
on public.office_accounts
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

drop policy if exists "admins can delete office accounts" on public.office_accounts;
create policy "admins can delete office accounts"
on public.office_accounts
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
);

drop policy if exists "users can read their own office account" on public.office_accounts;
create policy "users can read their own office account"
on public.office_accounts
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "admins can read office module access" on public.office_module_access;
create policy "admins can read office module access"
on public.office_module_access
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
);

drop policy if exists "admins can insert office module access" on public.office_module_access;
create policy "admins can insert office module access"
on public.office_module_access
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

drop policy if exists "admins can update office module access" on public.office_module_access;
create policy "admins can update office module access"
on public.office_module_access
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

drop policy if exists "admins can delete office module access" on public.office_module_access;
create policy "admins can delete office module access"
on public.office_module_access
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
);

drop policy if exists "users can read their own office module access" on public.office_module_access;
create policy "users can read their own office module access"
on public.office_module_access
for select
to authenticated
using (
  exists (
    select 1
    from public.office_accounts
    where office_accounts.id = office_module_access.office_account_id
      and office_accounts.auth_user_id = auth.uid()
  )
);

commit;
