begin;

delete from public.support_day_entries entry
using public.support_days day, public.technicians technician
where entry.support_day_id = day.id
  and entry.technician_id = technician.id
  and day.site_code is not null
  and technician.site_code is not null
  and day.site_code <> technician.site_code
  and entry.activity_id is null
  and entry.observation is null
  and entry.brief_agency is null
  and entry.brief_remote is null
  and entry.debrief_agency is null
  and entry.debrief_remote is null
  and entry.gtv is null;

create or replace function public.ensure_support_day_entry_site_match()
returns trigger
language plpgsql
as $$
declare
  support_site_code text;
  technician_site_code text;
begin
  select site_code
    into support_site_code
  from public.support_days
  where id = new.support_day_id;

  select site_code
    into technician_site_code
  from public.technicians
  where id = new.technician_id;

  if support_site_code is not null
     and technician_site_code is not null
     and support_site_code <> technician_site_code then
    raise exception
      'Support day site (%) does not match technician site (%)',
      support_site_code,
      technician_site_code;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_support_day_entry_site_match on public.support_day_entries;
create trigger ensure_support_day_entry_site_match
before insert or update of support_day_id, technician_id
on public.support_day_entries
for each row
execute function public.ensure_support_day_entry_site_match();

commit;
