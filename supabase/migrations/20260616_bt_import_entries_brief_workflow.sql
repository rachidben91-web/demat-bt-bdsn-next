begin;

alter table public.bt_import_entries
  add column if not exists source_mode text not null default 'daily_pdf',
  add column if not exists brief_workflow_status text not null default 'normal',
  add column if not exists team_override jsonb,
  add column if not exists workflow_note text,
  add column if not exists o2_pending_at timestamptz,
  add column if not exists o2_pending_by_email text,
  add column if not exists o2_validated_at timestamptz,
  add column if not exists o2_validated_by_email text,
  add column if not exists replacement_of_entry_id uuid,
  add column if not exists replaced_by_entry_id uuid,
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by_email text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bt_import_entries_source_mode_check'
  ) then
    alter table public.bt_import_entries
      add constraint bt_import_entries_source_mode_check
      check (source_mode in ('daily_pdf', 'unitary_import'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bt_import_entries_brief_workflow_status_check'
  ) then
    alter table public.bt_import_entries
      add constraint bt_import_entries_brief_workflow_status_check
      check (brief_workflow_status in ('normal', 'o2_pending', 'o2_validated'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bt_import_entries_replacement_of_entry_id_fkey'
  ) then
    alter table public.bt_import_entries
      add constraint bt_import_entries_replacement_of_entry_id_fkey
      foreign key (replacement_of_entry_id)
      references public.bt_import_entries(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bt_import_entries_replaced_by_entry_id_fkey'
  ) then
    alter table public.bt_import_entries
      add constraint bt_import_entries_replaced_by_entry_id_fkey
      foreign key (replaced_by_entry_id)
      references public.bt_import_entries(id)
      on delete set null;
  end if;
end $$;

create index if not exists bt_import_entries_brief_status_idx
  on public.bt_import_entries (import_day_id, brief_workflow_status, page_start asc);

create index if not exists bt_import_entries_superseded_idx
  on public.bt_import_entries (import_day_id, superseded_at, page_start asc);

create index if not exists bt_import_entries_replacement_of_idx
  on public.bt_import_entries (replacement_of_entry_id);

create index if not exists bt_import_entries_replaced_by_idx
  on public.bt_import_entries (replaced_by_entry_id);

comment on column public.bt_import_entries.source_mode is
  'Origine du BT actif: import journalier ou import unitaire de remplacement.';

comment on column public.bt_import_entries.brief_workflow_status is
  'Etat metier pilote depuis Brief: normal, o2_pending, o2_validated.';

comment on column public.bt_import_entries.team_override is
  'Affectation locale corrigee en attente ou apres validation O2. Prioritaire sur team pour l affichage.';

comment on column public.bt_import_entries.workflow_note is
  'Note libre de suivi metier pour la reaffectation / validation / remplacement.';

comment on column public.bt_import_entries.replacement_of_entry_id is
  'Sur le nouveau BT, pointe vers l ancien BT remplace.';

comment on column public.bt_import_entries.replaced_by_entry_id is
  'Sur l ancien BT, pointe vers le nouveau BT qui le remplace.';

comment on column public.bt_import_entries.superseded_at is
  'Date de sortie du flux actif. Un BT superseded ne doit plus remonter dans Referent.';

commit;
