begin;

alter table public.bt_import_entries
  add column if not exists mobile_ready boolean not null default false,
  add column if not exists mobile_ready_at timestamptz,
  add column if not exists mobile_ready_by_email text;

create index if not exists bt_import_entries_mobile_ready_idx
  on public.bt_import_entries (import_day_id, mobile_ready, page_start asc);

commit;
