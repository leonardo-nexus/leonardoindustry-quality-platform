-- ============================================================================
-- Migration 003 - Storage buckets e policies
-- ============================================================================
-- Bucket privati. Accesso via signed URLs dal backend.
-- ============================================================================

insert into storage.buckets (id, name, public) values
  ('documents', 'documents', false),
  ('evidence', 'evidence', false),
  ('welding', 'welding', false),
  ('certificates', 'certificates', false),
  ('audit-reports', 'audit-reports', false),
  ('ce-dossiers', 'ce-dossiers', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Policies: solo utenti autenticati con accesso alla company del file
-- Convenzione path: {company_id}/{anno}/{sotto-cartella}/{file}
-- ---------------------------------------------------------------------------
create policy "Authenticated users can read company files"
  on storage.objects for select
  using (
    auth.uid() is not null
    and bucket_id in ('documents','evidence','welding','certificates','audit-reports','ce-dossiers')
    and (
      is_group_level()
      or auth_role_code() = 'auditor'
      or (storage.foldername(name))[1] = auth_company_id()::text
    )
  );

create policy "Authenticated users can upload to their company folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('documents','evidence','welding','certificates','audit-reports','ce-dossiers')
    and (
      is_admin_gruppo()
      or (storage.foldername(name))[1] = auth_company_id()::text
    )
  );

create policy "Authenticated users can update their company files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('documents','evidence','welding','certificates','audit-reports','ce-dossiers')
    and (
      is_admin_gruppo()
      or (storage.foldername(name))[1] = auth_company_id()::text
    )
  )
  with check (
    bucket_id in ('documents','evidence','welding','certificates','audit-reports','ce-dossiers')
    and (
      is_admin_gruppo()
      or (storage.foldername(name))[1] = auth_company_id()::text
    )
  );

create policy "Only admin_gruppo can delete files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('documents','evidence','welding','certificates','audit-reports','ce-dossiers')
    and is_admin_gruppo()
  );
