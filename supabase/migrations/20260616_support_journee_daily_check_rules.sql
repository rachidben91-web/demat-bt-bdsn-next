begin;

alter table public.activity_definitions
  add column if not exists show_in_daily_check boolean not null default false,
  add column if not exists required_technicians integer null;

alter table public.activity_definitions
  drop constraint if exists activity_definitions_required_technicians_check;

alter table public.activity_definitions
  add constraint activity_definitions_required_technicians_check
  check (required_technicians is null or required_technicians >= 1);

update public.activity_definitions
set
  show_in_daily_check = case
    when code in ('IS_JOUR_1', 'IS_JOUR_2', 'IS_JOUR_3', 'LOCA', 'TRAVAUX_ASTREINTE', 'ASTREINTE') then true
    else false
  end,
  required_technicians = case code
    when 'IS_JOUR_1' then 1
    when 'IS_JOUR_2' then 1
    when 'IS_JOUR_3' then 1
    when 'LOCA' then 2
    when 'TRAVAUX_ASTREINTE' then 2
    when 'ASTREINTE' then 6
    else null
  end,
  updated_at = now()
where active = true;

commit;
