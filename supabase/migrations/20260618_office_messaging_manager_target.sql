begin;

alter table public.office_messages
drop constraint if exists office_messages_target_type_check;

alter table public.office_messages
add constraint office_messages_target_type_check
check (target_type in ('agency', 'site', 'manager', 'technician'));

commit;
