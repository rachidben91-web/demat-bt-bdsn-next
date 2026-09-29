begin;

create table if not exists public.office_session_management_history (
  id uuid primary key default gen_random_uuid(),
  performed_by uuid not null,
  target_user_id uuid not null,
  target_session_id uuid,
  action text not null check (action in ('revoke_session', 'revoke_all_sessions')),
  revoked_session_count integer not null check (revoked_session_count > 0),
  performed_at timestamptz not null default now()
);

create index if not exists office_session_management_history_target_idx
  on public.office_session_management_history (target_user_id, performed_at desc);

alter table public.office_session_management_history enable row level security;

revoke all on table public.office_session_management_history from anon, authenticated;

create or replace function public.list_office_account_sessions(p_site_code text default null)
returns table (
  session_id uuid,
  auth_user_id uuid,
  office_account_id uuid,
  full_name text,
  email text,
  created_at timestamptz,
  last_activity_at timestamptz,
  user_agent text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()::text
        and user_roles.role = 'admin'
    )
    or exists (
      select 1
      from public.office_accounts
      join public.office_module_access
        on office_module_access.office_account_id = office_accounts.id
      where office_accounts.auth_user_id = auth.uid()
        and office_accounts.account_status = 'active'
        and office_accounts.can_access_office_app = true
        and office_module_access.module_key = 'office_access'
        and office_module_access.permission_level = 'write'
    )
  ) then
    raise exception 'Le droit Acces en ecriture est requis.';
  end if;

  return query
  select
    sessions.id,
    sessions.user_id,
    accounts.id,
    accounts.full_name,
    accounts.email,
    sessions.created_at,
    coalesce(sessions.refreshed_at::timestamptz, sessions.updated_at, sessions.created_at),
    sessions.user_agent
  from auth.sessions as sessions
  join public.office_accounts as accounts
    on accounts.auth_user_id = sessions.user_id
  left join public.technicians as technicians
    on technicians.id = accounts.technician_id
  where p_site_code is null
    or accounts.technician_id is null
    or technicians.site_code = p_site_code
  order by accounts.full_name asc, sessions.updated_at desc nulls last, sessions.created_at desc;
end;
$$;

create or replace function public.revoke_office_account_sessions(
  p_target_user_id uuid,
  p_session_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  revoked_count integer;
  action_name text;
begin
  if auth.uid() is null then
    raise exception 'Session invalide.';
  end if;

  if auth.uid() = p_target_user_id then
    raise exception 'Utilise la deconnexion habituelle pour ton propre compte.';
  end if;

  if not (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()::text
        and user_roles.role = 'admin'
    )
    or exists (
      select 1
      from public.office_accounts
      join public.office_module_access
        on office_module_access.office_account_id = office_accounts.id
      where office_accounts.auth_user_id = auth.uid()
        and office_accounts.account_status = 'active'
        and office_accounts.can_access_office_app = true
        and office_module_access.module_key = 'office_access'
        and office_module_access.permission_level = 'write'
    )
  ) then
    raise exception 'Le droit Acces en ecriture est requis.';
  end if;

  if not exists (
    select 1
    from public.office_accounts
    where auth_user_id = p_target_user_id
  ) then
    raise exception 'Compte introuvable.';
  end if;

  if p_session_id is null then
    delete from auth.sessions
    where user_id = p_target_user_id;

    action_name := 'revoke_all_sessions';
  else
    delete from auth.sessions
    where id = p_session_id
      and user_id = p_target_user_id;

    action_name := 'revoke_session';
  end if;

  get diagnostics revoked_count = row_count;

  if revoked_count = 0 then
    raise exception 'Aucune session valide a deconnecter.';
  end if;

  insert into public.office_session_management_history (
    performed_by,
    target_user_id,
    target_session_id,
    action,
    revoked_session_count
  ) values (
    auth.uid(),
    p_target_user_id,
    p_session_id,
    action_name,
    revoked_count
  );

  return revoked_count;
end;
$$;

revoke all on function public.list_office_account_sessions(text) from public;
revoke all on function public.revoke_office_account_sessions(uuid, uuid) from public;
revoke all on function public.list_office_account_sessions(text) from anon;
revoke all on function public.revoke_office_account_sessions(uuid, uuid) from anon;

grant execute on function public.list_office_account_sessions(text) to authenticated;
grant execute on function public.revoke_office_account_sessions(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
