begin;

update public.support_day_entries entry
set activity_id = target_activity.id,
    updated_at = now()
from public.support_days day,
     public.activity_definitions current_activity,
     public.activity_definitions target_activity
where entry.support_day_id = day.id
  and entry.activity_id = current_activity.id
  and target_activity.site_code = day.site_code
  and target_activity.code = current_activity.code
  and day.site_code is not null
  and current_activity.site_code is not null
  and current_activity.site_code <> day.site_code;

create or replace function public.ensure_support_day_entry_site_match()
returns trigger
language plpgsql
as $$
declare
  support_site_code text;
  technician_site_code text;
  activity_site_code text;
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

  if new.activity_id is not null then
    select site_code
      into activity_site_code
    from public.activity_definitions
    where id = new.activity_id;

    if support_site_code is not null
       and activity_site_code is not null
       and support_site_code <> activity_site_code then
      raise exception
        'Support day site (%) does not match activity site (%)',
        support_site_code,
        activity_site_code;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_support_day_entry_site_match on public.support_day_entries;
create trigger ensure_support_day_entry_site_match
before insert or update of support_day_id, technician_id, activity_id
on public.support_day_entries
for each row
execute function public.ensure_support_day_entry_site_match();

commit;
