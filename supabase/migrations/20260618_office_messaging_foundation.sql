begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'office-message-attachments',
  'office-message-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.office_messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  target_type text not null check (target_type in ('agency', 'site', 'technician')),
  target_label text not null,
  target_site text,
  sent_by_user_id uuid references public.office_accounts(id) on delete set null,
  sent_by_email text not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.office_message_recipients (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.office_messages(id) on delete cascade,
  technician_id uuid not null references public.technicians(id) on delete cascade,
  office_account_id uuid references public.office_accounts(id) on delete set null,
  technician_name text not null,
  site_code text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (message_id, technician_id)
);

create table if not exists public.office_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.office_messages(id) on delete cascade,
  file_name text not null,
  mime_type text,
  file_size bigint not null default 0,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists office_messages_sent_at_idx
  on public.office_messages (sent_at desc);

create index if not exists office_message_recipients_technician_idx
  on public.office_message_recipients (technician_id, created_at desc);

create index if not exists office_message_recipients_account_idx
  on public.office_message_recipients (office_account_id, created_at desc);

create index if not exists office_message_attachments_message_idx
  on public.office_message_attachments (message_id);

alter table public.office_messages enable row level security;
alter table public.office_message_recipients enable row level security;
alter table public.office_message_attachments enable row level security;

drop policy if exists "office messaging read for module users" on public.office_messages;
create policy "office messaging read for module users"
on public.office_messages
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
      and office_module_access.module_key = 'messagerie'
      and office_module_access.permission_level in ('read', 'write')
  )
  or exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
);

drop policy if exists "terrain can read own messages" on public.office_messages;
create policy "terrain can read own messages"
on public.office_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.office_message_recipients
    join public.office_accounts
      on office_accounts.technician_id = office_message_recipients.technician_id
    where office_message_recipients.message_id = office_messages.id
      and office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_terrain_app = true
  )
);

drop policy if exists "office messaging write for module users" on public.office_messages;
create policy "office messaging write for module users"
on public.office_messages
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
      and office_module_access.module_key = 'messagerie'
      and office_module_access.permission_level = 'write'
  )
  or exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
);

drop policy if exists "terrain can read own message recipients" on public.office_message_recipients;
create policy "terrain can read own message recipients"
on public.office_message_recipients
for select
to authenticated
using (
  exists (
    select 1
    from public.office_accounts
    where office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_terrain_app = true
      and office_accounts.technician_id = office_message_recipients.technician_id
  )
  or exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()::text
      and user_roles.role = 'admin'
  )
);

drop policy if exists "office messaging read recipients for module users" on public.office_message_recipients;
create policy "office messaging read recipients for module users"
on public.office_message_recipients
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
      and office_module_access.module_key = 'messagerie'
      and office_module_access.permission_level in ('read', 'write')
  )
);

drop policy if exists "office messaging write recipients for module users" on public.office_message_recipients;
create policy "office messaging write recipients for module users"
on public.office_message_recipients
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
      and office_module_access.module_key = 'messagerie'
      and office_module_access.permission_level = 'write'
  )
);

drop policy if exists "terrain can mark own messages as read" on public.office_message_recipients;
create policy "terrain can mark own messages as read"
on public.office_message_recipients
for update
to authenticated
using (
  exists (
    select 1
    from public.office_accounts
    where office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_terrain_app = true
      and office_accounts.technician_id = office_message_recipients.technician_id
  )
)
with check (
  exists (
    select 1
    from public.office_accounts
    where office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_terrain_app = true
      and office_accounts.technician_id = office_message_recipients.technician_id
  )
);

drop policy if exists "office messaging read attachments for module users" on public.office_message_attachments;
create policy "office messaging read attachments for module users"
on public.office_message_attachments
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
      and office_module_access.module_key = 'messagerie'
      and office_module_access.permission_level in ('read', 'write')
  )
  or exists (
    select 1
    from public.office_message_recipients
    join public.office_accounts
      on office_accounts.technician_id = office_message_recipients.technician_id
    where office_message_recipients.message_id = office_message_attachments.message_id
      and office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_terrain_app = true
  )
);

drop policy if exists "office messaging write attachments for module users" on public.office_message_attachments;
create policy "office messaging write attachments for module users"
on public.office_message_attachments
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
      and office_module_access.module_key = 'messagerie'
      and office_module_access.permission_level = 'write'
  )
);

drop policy if exists "office message files read for message users" on storage.objects;
create policy "office message files read for message users"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'office-message-attachments'
  and (
    exists (
      select 1
      from public.office_accounts
      join public.office_module_access
        on office_module_access.office_account_id = office_accounts.id
      where office_accounts.auth_user_id = auth.uid()
        and office_accounts.account_status = 'active'
        and office_accounts.can_access_office_app = true
        and office_module_access.module_key = 'messagerie'
        and office_module_access.permission_level in ('read', 'write')
    )
    or exists (
      select 1
      from public.office_message_attachments
      join public.office_message_recipients
        on office_message_recipients.message_id = office_message_attachments.message_id
      join public.office_accounts
        on office_accounts.technician_id = office_message_recipients.technician_id
      where office_message_attachments.storage_path = storage.objects.name
        and office_accounts.auth_user_id = auth.uid()
        and office_accounts.account_status = 'active'
        and office_accounts.can_access_terrain_app = true
    )
    or exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()::text
        and user_roles.role = 'admin'
    )
  )
);

drop policy if exists "office message files write for module users" on storage.objects;
create policy "office message files write for module users"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'office-message-attachments'
  and (
    exists (
      select 1
      from public.office_accounts
      join public.office_module_access
        on office_module_access.office_account_id = office_accounts.id
      where office_accounts.auth_user_id = auth.uid()
        and office_accounts.account_status = 'active'
        and office_accounts.can_access_office_app = true
        and office_module_access.module_key = 'messagerie'
        and office_module_access.permission_level = 'write'
    )
    or exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()::text
        and user_roles.role = 'admin'
    )
  )
);

commit;
