begin;

alter table public.office_messages
  add column if not exists publish_at timestamptz not null default now(),
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz;

update public.office_messages
set publish_at = coalesce(publish_at, sent_at)
where publish_at is null;

create index if not exists office_messages_publish_at_idx
  on public.office_messages (publish_at desc);

create index if not exists office_messages_valid_until_idx
  on public.office_messages (valid_until);

commit;
