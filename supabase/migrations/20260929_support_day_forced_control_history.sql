begin;

create table if not exists public.support_day_control_history (
  id uuid primary key default gen_random_uuid(),
  support_day_id uuid not null references public.support_days(id) on delete cascade,
  previous_locked_by text not null,
  taken_by text not null,
  taken_at timestamptz not null default now()
);

create index if not exists support_day_control_history_day_taken_at_idx
  on public.support_day_control_history (support_day_id, taken_at desc);

alter table public.support_day_control_history enable row level security;

grant select, insert on table public.support_day_control_history to authenticated;

drop policy if exists "support day control history read for support users" on public.support_day_control_history;
create policy "support day control history read for support users"
on public.support_day_control_history
for select
to authenticated
using (
  exists (
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
  or exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
);

drop policy if exists "support day control history insert for support writers" on public.support_day_control_history;
create policy "support day control history insert for support writers"
on public.support_day_control_history
for insert
to authenticated
with check (
  exists (
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
  or exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
);

commit;
