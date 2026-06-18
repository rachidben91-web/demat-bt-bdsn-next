begin;

alter table public.office_messages
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by_user_id uuid references public.office_accounts(id) on delete set null;

create index if not exists office_messages_visible_idx
  on public.office_messages (sent_by_user_id, sent_at desc)
  where archived_at is null;

drop policy if exists "office messaging read for module users" on public.office_messages;
create policy "office messaging read for module users"
on public.office_messages
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
      and office_module_access.module_key = 'messagerie'
      and office_module_access.permission_level in ('read', 'write')
      and office_messages.sent_by_user_id = office_accounts.id
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
    where office_messages.id = office_message_recipients.message_id
      and office_accounts.auth_user_id = auth.uid()
      and office_accounts.account_status = 'active'
      and office_accounts.can_access_office_app = true
      and office_module_access.module_key = 'messagerie'
      and office_module_access.permission_level in ('read', 'write')
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
    where office_messages.id = office_message_attachments.message_id
      and office_accounts.auth_user_id = auth.uid()
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
      from public.user_roles
      where user_roles.user_id = auth.uid()::text
        and user_roles.role = 'admin'
    )
    or exists (
      select 1
      from public.office_message_attachments
      join public.office_messages
        on office_messages.id = office_message_attachments.message_id
      join public.office_accounts
        on office_accounts.id = office_messages.sent_by_user_id
      join public.office_module_access
        on office_module_access.office_account_id = office_accounts.id
      where office_message_attachments.storage_path = storage.objects.name
        and office_accounts.auth_user_id = auth.uid()
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
  )
);

commit;
