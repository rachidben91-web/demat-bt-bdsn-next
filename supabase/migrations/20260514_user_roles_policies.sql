-- ============================================================================
-- DEMAT-BT V2 - user_roles policies
-- Lecture du role utilisateur courant pour pilotage app et admin
-- ============================================================================

begin;

alter table public.user_roles enable row level security;

drop policy if exists "users_can_read_their_own_role" on public.user_roles;
create policy "users_can_read_their_own_role"
  on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid()::text);

commit;
