begin;

create table if not exists public.terrain_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  office_account_id uuid references public.office_accounts(id) on delete cascade,
  technician_id uuid references public.technicians(id) on delete cascade,
  scope text not null default 'terrain',
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terrain_push_subscriptions_scope_check check (scope in ('terrain'))
);

create index if not exists terrain_push_subscriptions_office_account_idx
  on public.terrain_push_subscriptions (office_account_id, updated_at desc);

create index if not exists terrain_push_subscriptions_technician_idx
  on public.terrain_push_subscriptions (technician_id, updated_at desc);

alter table public.terrain_push_subscriptions enable row level security;

commit;
