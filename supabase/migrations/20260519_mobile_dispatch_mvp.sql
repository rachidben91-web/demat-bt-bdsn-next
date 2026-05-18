begin;

create table if not exists public.mobile_dispatches (
  id uuid primary key default gen_random_uuid(),
  mission_date date not null,
  bt_import_day_id uuid references public.bt_import_days(id) on delete set null,
  support_day_id uuid references public.support_days(id) on delete set null,
  published_by_user_id uuid,
  published_by_email text not null,
  published_at timestamptz not null default now(),
  status text not null default 'published' check (
    status in ('published', 'archived')
  ),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.mobile_dispatch_items (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.mobile_dispatches(id) on delete cascade,
  technician_id uuid not null references public.technicians(id) on delete cascade,
  office_account_id uuid references public.office_accounts(id) on delete set null,
  technician_name text not null,
  mission_date date not null,
  site_code text,
  departure_instruction text not null default 'confirm' check (
    departure_instruction in ('agency', 'direct', 'confirm')
  ),
  activity_summary text not null,
  observation text,
  manager_name text,
  work_mode text,
  bt_count integer not null default 0,
  bt_ids jsonb not null default '[]'::jsonb,
  bt_payload jsonb not null default '[]'::jsonb,
  published_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by_account_id uuid references public.office_accounts(id) on delete set null,
  acknowledged_by_email text,
  created_at timestamptz not null default now()
);

create index if not exists mobile_dispatches_mission_date_idx
  on public.mobile_dispatches (mission_date desc, published_at desc);

create index if not exists mobile_dispatch_items_technician_id_idx
  on public.mobile_dispatch_items (technician_id, mission_date desc, published_at desc);

create index if not exists mobile_dispatch_items_office_account_id_idx
  on public.mobile_dispatch_items (office_account_id, mission_date desc, published_at desc);

alter table public.mobile_dispatches enable row level security;
alter table public.mobile_dispatch_items enable row level security;

drop policy if exists "admins can read mobile dispatches" on public.mobile_dispatches;
create policy "admins can read mobile dispatches"
on public.mobile_dispatches
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

drop policy if exists "admins can insert mobile dispatches" on public.mobile_dispatches;
create policy "admins can insert mobile dispatches"
on public.mobile_dispatches
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

drop policy if exists "admins can update mobile dispatches" on public.mobile_dispatches;
create policy "admins can update mobile dispatches"
on public.mobile_dispatches
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

drop policy if exists "admins can read mobile dispatch items" on public.mobile_dispatch_items;
create policy "admins can read mobile dispatch items"
on public.mobile_dispatch_items
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

drop policy if exists "admins can insert mobile dispatch items" on public.mobile_dispatch_items;
create policy "admins can insert mobile dispatch items"
on public.mobile_dispatch_items
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

drop policy if exists "admins can update mobile dispatch items" on public.mobile_dispatch_items;
create policy "admins can update mobile dispatch items"
on public.mobile_dispatch_items
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
