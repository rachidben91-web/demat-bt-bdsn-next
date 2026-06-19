begin;

create table if not exists public.sites (
  code text primary key,
  label text not null,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_sites on public.sites;
create trigger set_updated_at_sites
before update on public.sites
for each row
execute function public.set_updated_at();

insert into public.sites (code, label, display_order)
values
  ('VLG', 'Villeneuve-la-Garenne', 10),
  ('SAT', 'Sartrouville', 20)
on conflict (code) do update
set
  label = excluded.label,
  display_order = excluded.display_order,
  active = true,
  updated_at = now();

alter table public.technicians
  add column if not exists site_code text;

alter table public.managers
  add column if not exists site_code text;

alter table public.support_days
  add column if not exists site_code text not null default 'VLG';

alter table public.mobile_dispatches
  add column if not exists site_code text not null default 'VLG';

alter table public.mobile_dispatch_items
  alter column site_code set default 'VLG';

update public.technicians
set site_code = case
  when upper(trim(coalesce(site, ''))) = 'SAT' then 'SAT'
  when lower(trim(coalesce(site, ''))) = 'sartrouville' then 'SAT'
  else 'VLG'
end
where site_code is null or site_code not in ('VLG', 'SAT');

update public.managers
set site_code = 'VLG'
where site_code is null or site_code not in ('VLG', 'SAT');

update public.support_days
set site_code = 'VLG'
where site_code is null or site_code not in ('VLG', 'SAT');

update public.mobile_dispatches
set site_code = 'VLG'
where site_code is null or site_code not in ('VLG', 'SAT');

update public.mobile_dispatch_items
set site_code = 'VLG'
where site_code is null or site_code not in ('VLG', 'SAT');

alter table public.technicians
  alter column site_code set default 'VLG',
  alter column site_code set not null;

alter table public.managers
  alter column site_code set default 'VLG',
  alter column site_code set not null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'support_days'
      and con.contype = 'u'
      and pg_get_constraintdef(con.oid) = 'UNIQUE (day_date)'
  loop
    execute format('alter table public.support_days drop constraint %I', constraint_name);
  end loop;
end;
$$;

create unique index if not exists support_days_day_date_site_code_unique
  on public.support_days (day_date, site_code);

create index if not exists technicians_site_code_sort_order_idx
  on public.technicians (site_code, active, sort_order);

create index if not exists managers_site_code_name_idx
  on public.managers (site_code, name);

create index if not exists support_days_site_code_day_date_idx
  on public.support_days (site_code, day_date desc);

create index if not exists bt_import_days_site_code_day_date_idx
  on public.bt_import_days (site_code, day_date desc);

create index if not exists mobile_dispatch_items_site_code_mission_date_idx
  on public.mobile_dispatch_items (site_code, mission_date desc, published_at desc);

drop index if exists public.mobile_dispatch_items_technician_mission_date_unique;
drop index if exists public.mobile_dispatch_items_technician_mission_date_site_unique;

create unique index if not exists mobile_dispatch_items_technician_mission_date_site_unique
  on public.mobile_dispatch_items (technician_id, mission_date, site_code);

alter table public.mobile_dispatch_items
  alter column site_code set not null;

commit;
