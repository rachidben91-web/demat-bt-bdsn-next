begin;

create table if not exists public.office_message_replies (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.office_messages(id) on delete cascade,
  technician_id uuid not null references public.technicians(id) on delete cascade,
  office_account_id uuid references public.office_accounts(id) on delete set null,
  technician_name text not null,
  body text not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists office_message_replies_message_idx
  on public.office_message_replies (message_id, sent_at asc);

create index if not exists office_message_replies_technician_idx
  on public.office_message_replies (technician_id, sent_at desc);

alter table public.office_message_replies enable row level security;

drop policy if exists "terrain can read own message replies" on public.office_message_replies;
create policy "terrain can read own message replies"
on public.office_message_replies
for select
to authenticated
using (
  exists (
    select 1
    from public.office_accounts
    where office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_terrain_app = true
      and office_accounts.technician_id = office_message_replies.technician_id
  )
  or exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
);

drop policy if exists "terrain can insert own message replies" on public.office_message_replies;
create policy "terrain can insert own message replies"
on public.office_message_replies
for insert
to authenticated
with check (
  exists (
    select 1
    from public.office_accounts
    where office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_terrain_app = true
      and office_accounts.technician_id = office_message_replies.technician_id
  )
);

drop policy if exists "office can read replies for owned messages" on public.office_message_replies;
create policy "office can read replies for owned messages"
on public.office_message_replies
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
    from public.office_messages
    join public.office_accounts
      on office_accounts.id = office_messages.sent_by_user_id
    join public.office_module_access
      on office_module_access.office_account_id = office_accounts.id
    where office_messages.id = office_message_replies.message_id
      and office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_office_app = true
      and office_module_access.module_key = 'messagerie'
      and office_module_access.permission_level in ('read', 'write')
  )
);

commit;
