begin;

insert into public.office_module_access (
  office_account_id,
  module_key,
  permission_level
)
select
  source.office_account_id,
  'messagerie',
  source.permission_level
from public.office_module_access as source
where source.module_key = 'support_journee'
on conflict (office_account_id, module_key) do nothing;

alter table public.office_module_access
drop constraint if exists office_module_access_module_key_check;

alter table public.office_module_access
add constraint office_module_access_module_key_check
check (
  module_key in (
    'dashboard',
    'support_journee',
    'referent',
    'brief',
    'import_pdf',
    'messagerie',
    'technicians_admin',
    'office_access'
  )
);

commit;
