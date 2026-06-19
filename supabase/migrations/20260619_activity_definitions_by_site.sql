begin;

alter table public.activity_definitions
  add column if not exists site_code text not null default 'VLG';

alter table public.activity_definitions
  drop constraint if exists activity_definitions_site_code_check;

alter table public.activity_definitions
  add constraint activity_definitions_site_code_check
  check (site_code in ('VLG', 'SAT'));

do $$
declare
  unique_code_constraint text;
  unique_code_index text;
begin
  for unique_code_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'activity_definitions'
      and con.contype = 'u'
      and (
        select array_agg(att.attname order by ord.ordinality)
        from unnest(con.conkey) with ordinality as ord(attnum, ordinality)
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = ord.attnum
      ) = array['code'::name]
  loop
    execute format(
      'alter table public.activity_definitions drop constraint %I',
      unique_code_constraint
    );
  end loop;

  for unique_code_index in
    select idx.relname
    from pg_index ix
    join pg_class idx on idx.oid = ix.indexrelid
    join pg_class rel on rel.oid = ix.indrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    left join pg_constraint con on con.conindid = ix.indexrelid
    where nsp.nspname = 'public'
      and rel.relname = 'activity_definitions'
      and ix.indisunique
      and con.oid is null
      and (
        select array_agg(att.attname order by ord.ordinality)
        from unnest(ix.indkey) with ordinality as ord(attnum, ordinality)
        join pg_attribute att on att.attrelid = rel.oid and att.attnum = ord.attnum
      ) = array['code'::name]
  loop
    execute format('drop index if exists public.%I', unique_code_index);
  end loop;
end;
$$;

create unique index if not exists activity_definitions_site_code_code_key
  on public.activity_definitions (site_code, code);

create index if not exists activity_definitions_site_active_order_idx
  on public.activity_definitions (site_code, active, display_order);

insert into public.activity_definitions (
  code,
  label,
  color,
  status,
  display_order,
  active,
  required_technicians,
  show_in_daily_check,
  site_code
)
select
  code,
  label,
  color,
  status,
  display_order,
  active,
  required_technicians,
  show_in_daily_check,
  'SAT'
from public.activity_definitions
where site_code = 'VLG'
on conflict (site_code, code) do nothing;

commit;
