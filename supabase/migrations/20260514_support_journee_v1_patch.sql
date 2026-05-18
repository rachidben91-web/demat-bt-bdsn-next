-- ============================================================================
-- DEMAT-BT V2 - Support Journee V1 Patch
-- Migration corrective pour stabiliser le schema V1 avant integration Next.js
-- ============================================================================

begin;

-- ============================================================================
-- 1. updated_at automatique
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_managers on public.managers;
create trigger set_updated_at_managers
before update on public.managers
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_technicians on public.technicians;
create trigger set_updated_at_technicians
before update on public.technicians
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_activity_definitions on public.activity_definitions;
create trigger set_updated_at_activity_definitions
before update on public.activity_definitions
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_support_days on public.support_days;
create trigger set_updated_at_support_days
before update on public.support_days
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_support_day_entries on public.support_day_entries;
create trigger set_updated_at_support_day_entries
before update on public.support_day_entries
for each row
execute function public.set_updated_at();

-- ============================================================================
-- 2. Ne pas effacer l'historique si un technicien est supprime
--    On remplace ON DELETE CASCADE par ON DELETE RESTRICT
-- ============================================================================

do $$
declare
  existing_constraint text;
begin
  select con.conname
    into existing_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'support_day_entries'
    and con.contype = 'f'
    and pg_get_constraintdef(con.oid) like '%(technician_id)%';

  if existing_constraint is not null then
    execute format(
      'alter table public.support_day_entries drop constraint %I',
      existing_constraint
    );
  end if;
end;
$$;

alter table public.support_day_entries
add constraint support_day_entries_technician_id_fkey
foreign key (technician_id)
references public.technicians(id)
on delete restrict;

-- ============================================================================
-- 3. Enrichissement du catalogue d'activites pour coller au support historique
-- ============================================================================

insert into public.activity_definitions (code, label, color, status, display_order, active)
values
  ('CLIENTELE', 'Clientele', '#d9d9d9', 'present', 10, true),
  ('ASTREINTE', 'Astreinte', '#1d9bd7', 'present', 20, true),
  ('TRAVAUX', 'Travaux', '#95b7de', 'present', 30, true),
  ('TRAVAUX_ASTREINTE', 'Travaux astreinte', '#416fbd', 'present', 40, true),
  ('IS_JOUR_1', 'IS Jour 1', '#fff400', 'present', 50, true),
  ('IS_JOUR_2', 'IS Jour 2', '#ffef00', 'present', 60, true),
  ('IS_JOUR_3', 'IS Jour 3', '#fce300', 'present', 70, true),
  ('DEP_1', 'DEP 1', '#f7db00', 'present', 80, true),
  ('DEP_2', 'DEP 2', '#e8ce00', 'present', 90, true),
  ('DEP_3', 'DEP 3', '#d4b400', 'present', 100, true),
  ('CICM', 'CICM', '#abc88e', 'present', 110, true),
  ('ROB', 'ROB', '#aad090', 'present', 120, true),
  ('CICM_OPTIC', 'CICM OPTIC', '#aad18e', 'present', 130, true),
  ('RSF', 'RSF', '#aad18e', 'present', 140, true),
  ('LOCA', 'LOCA', '#f7b788', 'present', 150, true),
  ('IMMEUBLE_NEUF', 'Immeuble neuf', '#c69300', 'present', 160, true),
  ('IMMEUBLE_MONOXYDE', 'Immeuble monoxyde', '#c59700', 'present', 170, true),
  ('PREPA_IMMEUBLE', 'Prepa immeuble', '#cc9f00', 'present', 180, true),
  ('MAGASIN', 'Magasin', '#806400', 'present', 190, true),
  ('AIR_PEDAGOGIQUE', 'Air pedagogique', '#07a646', 'present', 200, true),
  ('PREPA_EAP', 'Prepa EAP', '#0b9c4b', 'present', 210, true),
  ('REUNION_EQUIPE', 'Reunion d''equipe', '#7f6500', 'present', 220, true),
  ('ADMINISTRATIF', 'Administratif', '#7d6500', 'present', 230, true),
  ('SORTIE_ASTREINTE', 'Sortie d''astreinte', '#c7d1df', 'present', 240, true),
  ('RTT', 'RTT', '#d00000', 'absent', 300, true),
  ('CP', 'CP', '#d00000', 'absent', 310, true),
  ('ABS', 'Absence', '#d00000', 'absent', 320, true),
  ('FP', 'FP', '#ff0c0c', 'absent', 330, true),
  ('10', '10', '#d00000', 'absent', 340, true),
  ('21', '21', '#d00000', 'absent', 350, true),
  ('41', '41', '#d00000', 'absent', 360, true),
  ('PAT', 'PAT', '#d00000', 'absent', 370, true),
  ('A2T', 'A2T', '#999999', 'greve', 380, true)
on conflict (code) do update
set
  label = excluded.label,
  color = excluded.color,
  status = excluded.status,
  display_order = excluded.display_order,
  active = excluded.active,
  updated_at = now();

-- ============================================================================
-- 4. Remettre en ordre l'affichage des techniciens si besoin
-- ============================================================================

update public.support_day_entries e
set
  display_order = t.sort_order,
  updated_at = now()
from public.technicians t
where e.technician_id = t.id
  and e.display_order is distinct from t.sort_order;

commit;

-- ============================================================================
-- Verification rapide apres migration
-- ============================================================================

select
  (select count(*) from public.activity_definitions where active = true) as active_activities_count,
  (select count(*) from public.technicians where active = true) as active_technicians_count,
  (select count(*) from public.support_days) as support_days_count,
  (select count(*) from public.support_day_entries) as support_day_entries_count;
