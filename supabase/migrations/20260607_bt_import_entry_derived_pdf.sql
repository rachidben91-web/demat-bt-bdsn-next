begin;

alter table public.bt_import_entries
  add column if not exists derived_pdf_storage_path text,
  add column if not exists derived_pdf_page_count integer
    check (derived_pdf_page_count is null or derived_pdf_page_count >= 0);

create index if not exists bt_import_entries_derived_pdf_idx
  on public.bt_import_entries (import_day_id, bt_id, derived_pdf_storage_path);

commit;
