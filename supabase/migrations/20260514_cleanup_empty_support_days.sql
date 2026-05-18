begin;

with empty_support_days as (
  select sd.id
  from public.support_days sd
  where not exists (
    select 1
    from public.support_day_entry_history h
    join public.support_day_entries e
      on e.id = h.support_day_entry_id
    where e.support_day_id = sd.id
  )
  and not exists (
    select 1
    from public.support_day_entries e
    where e.support_day_id = sd.id
      and (
        e.activity_id is not null
        or e.observation is not null
        or e.brief_agency is not null
        or e.brief_remote is not null
        or e.debrief_agency is not null
        or e.debrief_remote is not null
        or e.gtv is not null
      )
  )
)
delete from public.support_days
where id in (select id from empty_support_days);

commit;
