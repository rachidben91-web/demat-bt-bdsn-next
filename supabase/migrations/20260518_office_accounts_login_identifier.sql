begin;

alter table public.office_accounts
add column if not exists login_identifier text;

create unique index if not exists office_accounts_login_identifier_unique
  on public.office_accounts (login_identifier)
  where login_identifier is not null;

update public.office_accounts as oa
set login_identifier = lower(t.nni)
from public.technicians as t
where oa.technician_id = t.id
  and oa.login_identifier is null
  and nullif(trim(t.nni), '') is not null;

commit;
