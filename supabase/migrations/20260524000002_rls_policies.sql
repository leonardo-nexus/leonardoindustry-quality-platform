-- ============================================================================
-- Migration 002 - Row Level Security policies
-- ============================================================================
-- Modello gerarchico:
--   admin_gruppo      → vede e gestisce tutto
--   direzione_gruppo  → vede tutto (read-only su operativo), approva escalation
--   direzione_impresa → vede e gestisce solo la propria impresa
--   responsabili_*    → vede e gestisce solo i processi assegnati nella propria impresa
--   project_manager   → vede e gestisce commesse della propria impresa
--   capo_off./cant.   → operativo sulla sede assegnata
--   auditor           → vede tutto in lettura, gestisce audit assegnati
--   operatore         → vede solo task/checklist proprie
--   fornitore         → vede solo i propri documenti
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
create or replace function auth_person_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from person where auth_user_id = auth.uid() and active = true limit 1;
$$;

create or replace function auth_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from person where auth_user_id = auth.uid() and active = true limit 1;
$$;

create or replace function auth_role_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.code
  from person p join role r on r.id = p.role_id
  where p.auth_user_id = auth.uid() and p.active = true
  limit 1;
$$;

create or replace function is_group_level()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth_role_code() in ('admin_gruppo','direzione_gruppo'), false);
$$;

create or replace function is_admin_gruppo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth_role_code() = 'admin_gruppo', false);
$$;

create or replace function can_write_company(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when is_admin_gruppo() then true
    when auth_role_code() = 'direzione_gruppo' then false
    when auth_role_code() = 'fornitore' then false
    when auth_role_code() = 'operatore' then false
    when auth_role_code() = 'auditor' then false
    else auth_company_id() = target_company
  end;
$$;

create or replace function can_read_company(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when is_group_level() then true
    when auth_role_code() = 'auditor' then true
    else auth_company_id() = target_company
  end;
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on all operational tables
-- ---------------------------------------------------------------------------
alter table company_group enable row level security;
alter table company enable row level security;
alter table site enable row level security;
alter table role enable row level security;
alter table person enable row level security;
alter table process enable row level security;
alter table standard enable row level security;
alter table standard_requirement enable row level security;
alter table process_requirement enable row level security;
alter table file_attachment enable row level security;
alter table document enable row level security;
alter table document_revision enable row level security;
alter table document_requirement enable row level security;
alter table task enable row level security;
alter table reminder enable row level security;
alter table audit enable row level security;
alter table audit_checklist enable row level security;
alter table audit_finding enable row level security;
alter table non_conformity enable row level security;
alter table corrective_action enable row level security;
alter table competence enable row level security;
alter table person_competence enable row level security;
alter table training_event enable row level security;
alter table training_attendee enable row level security;
alter table supplier enable row level security;
alter table supplier_document enable row level security;
alter table asset enable row level security;
alter table asset_event enable row level security;
alter table execution_class enable row level security;
alter table welding_process enable row level security;
alter table project enable row level security;
alter table drawing enable row level security;
alter table wps enable row level security;
alter table wpqr enable row level security;
alter table welder_qualification enable row level security;
alter table material_lot enable row level security;
alter table weld enable row level security;
alter table weld_inspection enable row level security;
alter table ce_dossier enable row level security;

-- ---------------------------------------------------------------------------
-- Anagrafiche di gruppo
-- ---------------------------------------------------------------------------
create policy company_group_read on company_group for select using (auth.uid() is not null);
create policy company_group_write on company_group for all using (is_admin_gruppo()) with check (is_admin_gruppo());

create policy company_read on company for select using (is_group_level() or auth_company_id() = id or auth_role_code() = 'auditor');
create policy company_insert on company for insert with check (is_admin_gruppo());
create policy company_update on company for update using (is_admin_gruppo() or (auth_role_code() = 'direzione_impresa' and auth_company_id() = id))
  with check (is_admin_gruppo() or (auth_role_code() = 'direzione_impresa' and auth_company_id() = id));
create policy company_delete on company for delete using (is_admin_gruppo());

create policy site_read on site for select using (can_read_company(company_id));
create policy site_write on site for all using (can_write_company(company_id)) with check (can_write_company(company_id));

create policy role_read on role for select using (auth.uid() is not null);
create policy role_write on role for all using (is_admin_gruppo()) with check (is_admin_gruppo());

create policy person_read on person for select using (
  can_read_company(company_id) or auth_user_id = auth.uid()
);
create policy person_insert on person for insert with check (can_write_company(company_id));
create policy person_update on person for update using (
  can_write_company(company_id) or auth_user_id = auth.uid()
) with check (
  can_write_company(company_id) or auth_user_id = auth.uid()
);
create policy person_delete on person for delete using (can_write_company(company_id));

-- ---------------------------------------------------------------------------
-- Cataloghi condivisi (process, standard, competence, execution_class, welding_process)
-- ---------------------------------------------------------------------------
create policy process_read on process for select using (auth.uid() is not null);
create policy process_write on process for all using (is_admin_gruppo()) with check (is_admin_gruppo());

create policy standard_read on standard for select using (auth.uid() is not null);
create policy standard_write on standard for all using (is_admin_gruppo()) with check (is_admin_gruppo());

create policy requirement_read on standard_requirement for select using (auth.uid() is not null);
create policy requirement_write on standard_requirement for all using (is_admin_gruppo()) with check (is_admin_gruppo());

create policy proc_req_read on process_requirement for select using (auth.uid() is not null);
create policy proc_req_write on process_requirement for all using (is_admin_gruppo()) with check (is_admin_gruppo());

create policy competence_read on competence for select using (auth.uid() is not null);
create policy competence_write on competence for all using (is_admin_gruppo()) with check (is_admin_gruppo());

create policy execution_class_read on execution_class for select using (auth.uid() is not null);
create policy execution_class_write on execution_class for all using (is_admin_gruppo()) with check (is_admin_gruppo());

create policy welding_process_read on welding_process for select using (auth.uid() is not null);
create policy welding_process_write on welding_process for all using (is_admin_gruppo()) with check (is_admin_gruppo());

-- ---------------------------------------------------------------------------
-- File attachments
-- ---------------------------------------------------------------------------
create policy file_read on file_attachment for select using (
  company_id is null or can_read_company(company_id)
);
create policy file_write on file_attachment for all using (
  company_id is null or can_write_company(company_id)
) with check (
  company_id is null or can_write_company(company_id)
);

-- ---------------------------------------------------------------------------
-- Documenti
-- ---------------------------------------------------------------------------
create policy document_read on document for select using (
  company_id is null or can_read_company(company_id)
);
create policy document_write on document for all using (
  company_id is null and is_admin_gruppo() or can_write_company(company_id)
) with check (
  company_id is null and is_admin_gruppo() or can_write_company(company_id)
);

create policy document_revision_read on document_revision for select using (
  exists (select 1 from document d where d.id = document_id and (d.company_id is null or can_read_company(d.company_id)))
);
create policy document_revision_write on document_revision for all using (
  exists (select 1 from document d where d.id = document_id and ((d.company_id is null and is_admin_gruppo()) or can_write_company(d.company_id)))
) with check (
  exists (select 1 from document d where d.id = document_id and ((d.company_id is null and is_admin_gruppo()) or can_write_company(d.company_id)))
);

create policy document_requirement_read on document_requirement for select using (
  exists (select 1 from document d where d.id = document_id and (d.company_id is null or can_read_company(d.company_id)))
);
create policy document_requirement_write on document_requirement for all using (
  is_admin_gruppo()
) with check (is_admin_gruppo());

-- ---------------------------------------------------------------------------
-- Task e reminder
-- ---------------------------------------------------------------------------
create policy task_read on task for select using (
  can_read_company(company_id)
  or responsible_id = auth_person_id()
);
create policy task_write on task for all using (
  can_write_company(company_id)
  or responsible_id = auth_person_id()
) with check (
  can_write_company(company_id)
  or responsible_id = auth_person_id()
);

create policy reminder_read on reminder for select using (
  exists (select 1 from task t where t.id = task_id and (can_read_company(t.company_id) or t.responsible_id = auth_person_id()))
);
create policy reminder_write on reminder for all using (
  exists (select 1 from task t where t.id = task_id and (can_write_company(t.company_id) or t.responsible_id = auth_person_id()))
) with check (
  exists (select 1 from task t where t.id = task_id and (can_write_company(t.company_id) or t.responsible_id = auth_person_id()))
);

-- ---------------------------------------------------------------------------
-- Audit, NC, azioni
-- ---------------------------------------------------------------------------
create policy audit_read on audit for select using (can_read_company(company_id));
create policy audit_write on audit for all using (can_write_company(company_id) or auth_role_code() = 'auditor')
  with check (can_write_company(company_id) or auth_role_code() = 'auditor');

create policy checklist_read on audit_checklist for select using (
  exists (select 1 from audit a where a.id = audit_id and can_read_company(a.company_id))
);
create policy checklist_write on audit_checklist for all using (
  exists (select 1 from audit a where a.id = audit_id and (can_write_company(a.company_id) or auth_role_code() = 'auditor'))
) with check (
  exists (select 1 from audit a where a.id = audit_id and (can_write_company(a.company_id) or auth_role_code() = 'auditor'))
);

create policy finding_read on audit_finding for select using (
  exists (select 1 from audit a where a.id = audit_id and can_read_company(a.company_id))
);
create policy finding_write on audit_finding for all using (
  exists (select 1 from audit a where a.id = audit_id and (can_write_company(a.company_id) or auth_role_code() = 'auditor'))
) with check (
  exists (select 1 from audit a where a.id = audit_id and (can_write_company(a.company_id) or auth_role_code() = 'auditor'))
);

create policy nc_read on non_conformity for select using (can_read_company(company_id));
create policy nc_write on non_conformity for all using (can_write_company(company_id)) with check (can_write_company(company_id));

create policy action_read on corrective_action for select using (can_read_company(company_id));
create policy action_write on corrective_action for all using (can_write_company(company_id)) with check (can_write_company(company_id));

-- ---------------------------------------------------------------------------
-- Competenze e formazione
-- ---------------------------------------------------------------------------
create policy pc_read on person_competence for select using (
  exists (select 1 from person p where p.id = person_id and (can_read_company(p.company_id) or p.auth_user_id = auth.uid()))
);
create policy pc_write on person_competence for all using (
  exists (select 1 from person p where p.id = person_id and can_write_company(p.company_id))
) with check (
  exists (select 1 from person p where p.id = person_id and can_write_company(p.company_id))
);

create policy training_read on training_event for select using (can_read_company(company_id));
create policy training_write on training_event for all using (can_write_company(company_id)) with check (can_write_company(company_id));

create policy training_attendee_read on training_attendee for select using (
  exists (select 1 from training_event t where t.id = training_event_id and can_read_company(t.company_id))
);
create policy training_attendee_write on training_attendee for all using (
  exists (select 1 from training_event t where t.id = training_event_id and can_write_company(t.company_id))
) with check (
  exists (select 1 from training_event t where t.id = training_event_id and can_write_company(t.company_id))
);

-- ---------------------------------------------------------------------------
-- Fornitori
-- ---------------------------------------------------------------------------
create policy supplier_read on supplier for select using (can_read_company(company_id));
create policy supplier_write on supplier for all using (can_write_company(company_id)) with check (can_write_company(company_id));

create policy supplier_doc_read on supplier_document for select using (
  exists (select 1 from supplier s where s.id = supplier_id and can_read_company(s.company_id))
);
create policy supplier_doc_write on supplier_document for all using (
  exists (select 1 from supplier s where s.id = supplier_id and can_write_company(s.company_id))
) with check (
  exists (select 1 from supplier s where s.id = supplier_id and can_write_company(s.company_id))
);

-- ---------------------------------------------------------------------------
-- Asset
-- ---------------------------------------------------------------------------
create policy asset_read on asset for select using (can_read_company(company_id));
create policy asset_write on asset for all using (can_write_company(company_id)) with check (can_write_company(company_id));

create policy asset_event_read on asset_event for select using (
  exists (select 1 from asset a where a.id = asset_id and can_read_company(a.company_id))
);
create policy asset_event_write on asset_event for all using (
  exists (select 1 from asset a where a.id = asset_id and can_write_company(a.company_id))
) with check (
  exists (select 1 from asset a where a.id = asset_id and can_write_company(a.company_id))
);

-- ---------------------------------------------------------------------------
-- Commesse + saldatura UNE-EN 1090
-- ---------------------------------------------------------------------------
create policy project_read on project for select using (can_read_company(company_id));
create policy project_write on project for all using (can_write_company(company_id)) with check (can_write_company(company_id));

create policy drawing_read on drawing for select using (
  exists (select 1 from project p where p.id = project_id and can_read_company(p.company_id))
);
create policy drawing_write on drawing for all using (
  exists (select 1 from project p where p.id = project_id and can_write_company(p.company_id))
) with check (
  exists (select 1 from project p where p.id = project_id and can_write_company(p.company_id))
);

create policy wps_read on wps for select using (can_read_company(company_id));
create policy wps_write on wps for all using (can_write_company(company_id)) with check (can_write_company(company_id));

create policy wpqr_read on wpqr for select using (
  exists (select 1 from wps w where w.id = wps_id and can_read_company(w.company_id))
);
create policy wpqr_write on wpqr for all using (
  exists (select 1 from wps w where w.id = wps_id and can_write_company(w.company_id))
) with check (
  exists (select 1 from wps w where w.id = wps_id and can_write_company(w.company_id))
);

create policy wq_read on welder_qualification for select using (
  exists (select 1 from person p where p.id = person_id and (can_read_company(p.company_id) or p.auth_user_id = auth.uid()))
);
create policy wq_write on welder_qualification for all using (
  exists (select 1 from person p where p.id = person_id and can_write_company(p.company_id))
) with check (
  exists (select 1 from person p where p.id = person_id and can_write_company(p.company_id))
);

create policy material_read on material_lot for select using (can_read_company(company_id));
create policy material_write on material_lot for all using (can_write_company(company_id)) with check (can_write_company(company_id));

create policy weld_read on weld for select using (
  exists (select 1 from project p where p.id = project_id and can_read_company(p.company_id))
);
create policy weld_write on weld for all using (
  exists (select 1 from project p where p.id = project_id and can_write_company(p.company_id))
) with check (
  exists (select 1 from project p where p.id = project_id and can_write_company(p.company_id))
);

create policy inspection_read on weld_inspection for select using (
  exists (select 1 from weld w join project p on p.id = w.project_id where w.id = weld_id and can_read_company(p.company_id))
);
create policy inspection_write on weld_inspection for all using (
  exists (select 1 from weld w join project p on p.id = w.project_id where w.id = weld_id and can_write_company(p.company_id))
) with check (
  exists (select 1 from weld w join project p on p.id = w.project_id where w.id = weld_id and can_write_company(p.company_id))
);

create policy ce_dossier_read on ce_dossier for select using (
  exists (select 1 from project p where p.id = project_id and can_read_company(p.company_id))
);
create policy ce_dossier_write on ce_dossier for all using (
  exists (select 1 from project p where p.id = project_id and can_write_company(p.company_id))
) with check (
  exists (select 1 from project p where p.id = project_id and can_write_company(p.company_id))
);
