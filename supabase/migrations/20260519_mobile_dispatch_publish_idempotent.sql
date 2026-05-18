begin;

with ranked_items as (
  select
    id,
    row_number() over (
      partition by technician_id, mission_date
      order by published_at desc, created_at desc, id desc
    ) as row_rank
  from public.mobile_dispatch_items
)
delete from public.mobile_dispatch_items
where id in (
  select id
  from ranked_items
  where row_rank > 1
);

delete from public.mobile_dispatches
where not exists (
  select 1
  from public.mobile_dispatch_items
  where mobile_dispatch_items.dispatch_id = mobile_dispatches.id
);

create unique index if not exists mobile_dispatch_items_technician_mission_date_unique
  on public.mobile_dispatch_items (technician_id, mission_date);

commit;
