-- ============================================================================
-- Migration 001 - Initial quality system schema
-- ============================================================================
-- Sistema integrato gestione qualità ISO 9001 / 45001 / 14001 / UNE-EN 1090
-- Gruppo Leonardoindustry, 9 imprese
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
create type site_type as enum ('sede','officina','cantiere','magazzino');
create type process_category as enum ('qualita','sicurezza','ambiente','operativo','saldatura','direzione','fornitori','hr');
create type applicability_status as enum ('applicabile','non_applicabile','parziale');
create type document_type as enum ('procedura','istruzione','modulo','registro','certificato','disegno','wps','wpqr','rapporto_controllo','dossier','documento_esterno');
create type document_status as enum ('bozza','in_revisione','attivo','sospeso','obsoleto','archiviato');
create type task_status as enum ('aperta','in_corso','scaduta','chiusa','verificata');
create type task_priority as enum ('bassa','media','alta','critica');
create type task_source_type as enum ('documento','audit','non_conformita','azione_correttiva','formazione','visita_medica','fornitore','strumento','veicolo','saldatura','wps','wpqr','qualifica_saldatore','cantiere','ambiente','sicurezza','altro');
create type audit_type as enum ('interno','esterno','cliente','fornitore','fpc');
create type audit_status as enum ('pianificato','eseguito','chiuso');
create type audit_finding_type as enum ('osservazione','raccomandazione','non_conformita_minore','non_conformita_maggiore','punto_forte');
create type nc_severity as enum ('minore','maggiore','critica');
create type nc_status as enum ('aperta','analisi_causa','azione_definita','in_verifica','chiusa');
create type action_source_type as enum ('non_conformita','audit','incidente','rischio','miglioramento','reclamo_cliente','altro');
create type action_status as enum ('aperta','in_corso','completata','efficace','non_efficace');
create type competence_status as enum ('valida','in_scadenza','scaduta','sospesa');
create type asset_type as enum ('strumento_misura','saldatrice','attrezzatura','veicolo','estintore','dpi','macchina_officina','altro');
create type asset_status as enum ('disponibile','assegnato','fuori_servizio','dismesso');
create type asset_event_type as enum ('taratura','verifica','manutenzione','revisione','riparazione','fuori_servizio','rientro_servizio');
create type conformity_result as enum ('conforme','non_conforme','limitato');
create type execution_class_code as enum ('EXC1','EXC2','EXC3','EXC4');
create type wps_status as enum ('bozza','valida','sospesa','obsoleta');
create type wpqr_status as enum ('valida','scaduta','sospesa');
create type welder_qualification_status as enum ('valida','in_scadenza','scaduta','sospesa');
create type material_status as enum ('disponibile','usato','bloccato','non_conforme');
create type weld_status as enum ('pianificata','autorizzata','eseguita','controllata','non_conforme','accettata');
create type inspection_type as enum ('VT','PT','MT','UT','RT','dimensionale');
create type dossier_status as enum ('aperto','in_revisione','approvato','consegnato');
create type project_status as enum ('aperta','in_corso','sospesa','chiusa','annullata');
create type supplier_type as enum ('fornitore','subappaltatore','laboratorio','ente','consulente');
create type supplier_qualification_status as enum ('da_valutare','qualificato','sospeso','non_qualificato');
create type supplier_doc_status as enum ('valido','in_scadenza','scaduto','mancante');

-- ---------------------------------------------------------------------------
-- Helper: trigger updated_at
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Block 1 - Anagrafiche base
-- ---------------------------------------------------------------------------
create table company_group (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_company_group_updated_at before update on company_group
  for each row execute function set_updated_at();

create table company (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references company_group(id) on delete restrict,
  name text not null,
  legal_name text,
  country text,
  tax_id text,
  vat_id text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id, name)
);
create trigger trg_company_updated_at before update on company
  for each row execute function set_updated_at();

create table site (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references company(id) on delete cascade,
  type site_type not null,
  name text not null,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_site_updated_at before update on site
  for each row execute function set_updated_at();

create table role (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  description text,
  is_group_level boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_role_updated_at before update on role
  for each row execute function set_updated_at();

create table person (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references company(id) on delete restrict,
  role_id uuid references role(id) on delete set null,
  auth_user_id uuid unique, -- collegamento a auth.users.id
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_person_auth_user on person(auth_user_id);
create index idx_person_company on person(company_id);
create trigger trg_person_updated_at before update on person
  for each row execute function set_updated_at();

create table process (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  description text,
  category process_category not null,
  owner_role_id uuid references role(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_process_updated_at before update on process
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Block 2 - Norme e requisiti
-- ---------------------------------------------------------------------------
create table standard (
  id uuid primary key default uuid_generate_v4(),
  code text not null,
  version text,
  title text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(code, version)
);
create trigger trg_standard_updated_at before update on standard
  for each row execute function set_updated_at();

create table standard_requirement (
  id uuid primary key default uuid_generate_v4(),
  standard_id uuid not null references standard(id) on delete cascade,
  clause text not null,
  title text not null,
  requirement_summary text,
  evidence_expected text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(standard_id, clause)
);
create index idx_requirement_standard on standard_requirement(standard_id);
create trigger trg_requirement_updated_at before update on standard_requirement
  for each row execute function set_updated_at();

create table process_requirement (
  id uuid primary key default uuid_generate_v4(),
  process_id uuid not null references process(id) on delete cascade,
  requirement_id uuid not null references standard_requirement(id) on delete cascade,
  applicability applicability_status not null default 'applicabile',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(process_id, requirement_id)
);
create index idx_proc_req_process on process_requirement(process_id);
create index idx_proc_req_requirement on process_requirement(requirement_id);
create trigger trg_proc_req_updated_at before update on process_requirement
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Block 3 - File e documenti
-- ---------------------------------------------------------------------------
create table file_attachment (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references company(id) on delete set null,
  bucket text not null default 'documents',
  storage_path text not null,
  original_path text,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  checksum text,
  uploaded_by uuid references person(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_file_company on file_attachment(company_id);
create trigger trg_file_updated_at before update on file_attachment
  for each row execute function set_updated_at();

create table document (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references company(id) on delete cascade,
  process_id uuid references process(id) on delete set null,
  code text not null,
  title text not null,
  type document_type not null,
  status document_status not null default 'bozza',
  owner_id uuid references person(id) on delete set null,
  review_frequency_months integer,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_document_company on document(company_id);
create index idx_document_process on document(process_id);
create index idx_document_code on document(code);
create index idx_document_status on document(status);
create trigger trg_document_updated_at before update on document
  for each row execute function set_updated_at();

create table document_revision (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references document(id) on delete cascade,
  revision text not null,
  issue_date date,
  next_review_date date,
  approved_by uuid references person(id) on delete set null,
  file_id uuid references file_attachment(id) on delete set null,
  is_current boolean not null default false,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_id, revision)
);
create unique index one_current_revision_per_document
  on document_revision(document_id) where is_current = true;
create trigger trg_document_revision_updated_at before update on document_revision
  for each row execute function set_updated_at();

create table document_requirement (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references document(id) on delete cascade,
  requirement_id uuid not null references standard_requirement(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique(document_id, requirement_id)
);

-- ---------------------------------------------------------------------------
-- Block 4 - Scadenze, task e reminder
-- ---------------------------------------------------------------------------
create table task (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references company(id) on delete cascade,
  site_id uuid references site(id) on delete set null,
  process_id uuid references process(id) on delete set null,
  source_type task_source_type not null,
  source_id uuid,
  title text not null,
  description text,
  responsible_id uuid not null references person(id) on delete restrict,
  due_date date not null,
  priority task_priority not null default 'media',
  status task_status not null default 'aperta',
  blocks_operations boolean not null default false,
  notes text,
  closed_at timestamptz,
  closed_by uuid references person(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_task_company_status_due on task(company_id, status, due_date);
create index idx_task_responsible on task(responsible_id);
create index idx_task_source on task(source_type, source_id);
create trigger trg_task_updated_at before update on task
  for each row execute function set_updated_at();

create table reminder (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references task(id) on delete cascade,
  remind_at timestamptz not null,
  channel text not null default 'app',
  sent_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_reminder_task on reminder(task_id);
create index idx_reminder_remind_at on reminder(remind_at) where sent_at is null;

-- ---------------------------------------------------------------------------
-- Block 5 - Audit, NC e azioni
-- ---------------------------------------------------------------------------
create table audit (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references company(id) on delete cascade,
  site_id uuid references site(id) on delete set null,
  standard_id uuid references standard(id) on delete set null,
  process_id uuid references process(id) on delete set null,
  code text,
  audit_type audit_type not null,
  planned_date date not null,
  executed_date date,
  lead_auditor_id uuid references person(id) on delete set null,
  scope text,
  notes text,
  status audit_status not null default 'pianificato',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_audit_company_status on audit(company_id, status);
create trigger trg_audit_updated_at before update on audit
  for each row execute function set_updated_at();

create table audit_checklist (
  id uuid primary key default uuid_generate_v4(),
  audit_id uuid not null references audit(id) on delete cascade,
  requirement_id uuid references standard_requirement(id) on delete set null,
  question text not null,
  expected_evidence text,
  ordering integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_checklist_audit on audit_checklist(audit_id);

create table audit_finding (
  id uuid primary key default uuid_generate_v4(),
  audit_id uuid not null references audit(id) on delete cascade,
  checklist_id uuid references audit_checklist(id) on delete set null,
  finding_type audit_finding_type not null,
  description text not null,
  evidence_file_id uuid references file_attachment(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_finding_audit on audit_finding(audit_id);

create table non_conformity (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references company(id) on delete cascade,
  process_id uuid references process(id) on delete set null,
  requirement_id uuid references standard_requirement(id) on delete set null,
  audit_id uuid references audit(id) on delete set null,
  finding_id uuid references audit_finding(id) on delete set null,
  code text,
  severity nc_severity not null default 'minore',
  title text not null,
  description text not null,
  detected_at date not null default current_date,
  detected_by uuid references person(id) on delete set null,
  responsible_id uuid references person(id) on delete set null,
  status nc_status not null default 'aperta',
  closed_at timestamptz,
  closed_by uuid references person(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_nc_company_status on non_conformity(company_id, status);
create trigger trg_nc_updated_at before update on non_conformity
  for each row execute function set_updated_at();

create table corrective_action (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references company(id) on delete cascade,
  non_conformity_id uuid references non_conformity(id) on delete cascade,
  source_type action_source_type not null default 'non_conformita',
  source_id uuid,
  title text not null,
  root_cause text,
  action_plan text not null,
  responsible_id uuid not null references person(id) on delete restrict,
  due_date date not null,
  completed_at date,
  effectiveness_check text,
  effectiveness_verified_at date,
  effectiveness_verified_by uuid references person(id) on delete set null,
  status action_status not null default 'aperta',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_action_company_due on corrective_action(company_id, due_date, status);
create index idx_action_nc on corrective_action(non_conformity_id);
create trigger trg_action_updated_at before update on corrective_action
  for each row execute function set_updated_at();

-- ============================================================================
-- Regole di blocco NC/azione
-- ============================================================================
create or replace function enforce_nc_closure()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'chiusa' and (old.status is null or old.status <> 'chiusa') then
    if not exists (
      select 1 from corrective_action
      where non_conformity_id = new.id and active = true
    ) then
      raise exception 'NC % non chiudibile: nessuna azione correttiva collegata', new.id;
    end if;
    if not exists (
      select 1 from corrective_action
      where non_conformity_id = new.id and status = 'efficace' and active = true
    ) then
      raise exception 'NC % non chiudibile: nessuna azione correttiva verificata efficace', new.id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_nc_enforce_closure
  before update on non_conformity
  for each row execute function enforce_nc_closure();

create or replace function enforce_action_closure()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('efficace','non_efficace') and (old.status is null or old.status not in ('efficace','non_efficace')) then
    if new.effectiveness_check is null or new.effectiveness_verified_at is null then
      raise exception 'Azione % non chiudibile: verifica di efficacia mancante', new.id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_action_enforce_closure
  before update on corrective_action
  for each row execute function enforce_action_closure();

-- ---------------------------------------------------------------------------
-- Block 6 - Persone, competenze e formazione
-- ---------------------------------------------------------------------------
create table competence (
  id uuid primary key default uuid_generate_v4(),
  code text unique,
  name text not null unique,
  category process_category not null,
  requires_expiry boolean not null default false,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_competence_updated_at before update on competence
  for each row execute function set_updated_at();

create table person_competence (
  id uuid primary key default uuid_generate_v4(),
  person_id uuid not null references person(id) on delete cascade,
  competence_id uuid not null references competence(id) on delete restrict,
  certificate_file_id uuid references file_attachment(id) on delete set null,
  issue_date date,
  expiry_date date,
  status competence_status not null default 'valida',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(person_id, competence_id, issue_date)
);
create index idx_pc_person on person_competence(person_id);
create index idx_pc_expiry on person_competence(expiry_date);
create trigger trg_person_competence_updated_at before update on person_competence
  for each row execute function set_updated_at();

create table training_event (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references company(id) on delete cascade,
  competence_id uuid references competence(id) on delete set null,
  title text not null,
  training_date date not null,
  expiry_date date,
  provider text,
  file_id uuid references file_attachment(id) on delete set null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_training_company on training_event(company_id);
create trigger trg_training_updated_at before update on training_event
  for each row execute function set_updated_at();

create table training_attendee (
  id uuid primary key default uuid_generate_v4(),
  training_event_id uuid not null references training_event(id) on delete cascade,
  person_id uuid not null references person(id) on delete cascade,
  passed boolean,
  certificate_file_id uuid references file_attachment(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(training_event_id, person_id)
);

-- ---------------------------------------------------------------------------
-- Block 7 - Fornitori
-- ---------------------------------------------------------------------------
create table supplier (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references company(id) on delete cascade,
  name text not null,
  legal_name text,
  tax_id text,
  vat_id text,
  supplier_type supplier_type not null default 'fornitore',
  qualification_status supplier_qualification_status not null default 'da_valutare',
  last_evaluation_date date,
  next_evaluation_date date,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_supplier_company on supplier(company_id);
create trigger trg_supplier_updated_at before update on supplier
  for each row execute function set_updated_at();

create table supplier_document (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references supplier(id) on delete cascade,
  document_type text not null,
  file_id uuid references file_attachment(id) on delete set null,
  issue_date date,
  expiry_date date,
  status supplier_doc_status not null default 'valido',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_supplier_doc_supplier on supplier_document(supplier_id);
create trigger trg_supplier_doc_updated_at before update on supplier_document
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Block 8 - Asset, strumenti, veicoli
-- ---------------------------------------------------------------------------
create table asset (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references company(id) on delete cascade,
  site_id uuid references site(id) on delete set null,
  asset_type asset_type not null,
  code text not null,
  serial_number text,
  manufacturer text,
  model text,
  description text,
  status asset_status not null default 'disponibile',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, code)
);
create index idx_asset_company_status on asset(company_id, status);
create trigger trg_asset_updated_at before update on asset
  for each row execute function set_updated_at();

create table asset_event (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid not null references asset(id) on delete cascade,
  event_type asset_event_type not null,
  event_date date not null,
  next_due_date date,
  performed_by text,
  file_id uuid references file_attachment(id) on delete set null,
  result conformity_result,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_asset_event_asset on asset_event(asset_id);
create index idx_asset_event_due on asset_event(next_due_date);

-- ---------------------------------------------------------------------------
-- Block 9 - Commesse e UNE-EN 1090 / saldatura
-- ---------------------------------------------------------------------------
create table execution_class (
  id uuid primary key default uuid_generate_v4(),
  code execution_class_code not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table welding_process (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references company(id) on delete cascade,
  site_id uuid references site(id) on delete set null,
  code text not null,
  name text not null,
  customer_name text,
  project_manager_id uuid references person(id) on delete set null,
  execution_class_id uuid references execution_class(id) on delete set null,
  start_date date,
  end_date date,
  status project_status not null default 'aperta',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, code)
);
create index idx_project_company_status on project(company_id, status);
create trigger trg_project_updated_at before update on project
  for each row execute function set_updated_at();

create table drawing (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references project(id) on delete cascade,
  code text not null,
  revision text not null,
  title text,
  status document_status not null default 'bozza',
  file_id uuid references file_attachment(id) on delete set null,
  approved_by uuid references person(id) on delete set null,
  approved_at date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, code, revision)
);
create index idx_drawing_project on drawing(project_id);
create trigger trg_drawing_updated_at before update on drawing
  for each row execute function set_updated_at();

create table wps (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references company(id) on delete cascade,
  code text not null,
  revision text not null,
  welding_process_id uuid not null references welding_process(id),
  material_group text,
  thickness_min_mm numeric,
  thickness_max_mm numeric,
  position_range text,
  status wps_status not null default 'bozza',
  file_id uuid references file_attachment(id) on delete set null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, code, revision)
);
create index idx_wps_company_code on wps(company_id, code);
create trigger trg_wps_updated_at before update on wps
  for each row execute function set_updated_at();

create table wpqr (
  id uuid primary key default uuid_generate_v4(),
  wps_id uuid not null references wps(id) on delete cascade,
  certificate_code text not null,
  issue_date date,
  expiry_date date,
  file_id uuid references file_attachment(id) on delete set null,
  status wpqr_status not null default 'valida',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(wps_id, certificate_code)
);
create index idx_wpqr_wps on wpqr(wps_id);
create trigger trg_wpqr_updated_at before update on wpqr
  for each row execute function set_updated_at();

create table welder_qualification (
  id uuid primary key default uuid_generate_v4(),
  person_id uuid not null references person(id) on delete cascade,
  welding_process_id uuid not null references welding_process(id),
  certificate_code text not null,
  material_group text,
  thickness_min_mm numeric,
  thickness_max_mm numeric,
  position_range text,
  issue_date date,
  expiry_date date not null,
  file_id uuid references file_attachment(id) on delete set null,
  status welder_qualification_status not null default 'valida',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_wq_person on welder_qualification(person_id);
create index idx_wq_expiry on welder_qualification(expiry_date);
create trigger trg_wq_updated_at before update on welder_qualification
  for each row execute function set_updated_at();

create table material_lot (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references company(id) on delete cascade,
  project_id uuid references project(id) on delete set null,
  heat_number text,
  material_grade text not null,
  thickness_mm numeric,
  certificate_file_id uuid references file_attachment(id) on delete set null,
  status material_status not null default 'disponibile',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_material_company on material_lot(company_id);
create trigger trg_material_updated_at before update on material_lot
  for each row execute function set_updated_at();

create table weld (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references project(id) on delete cascade,
  drawing_id uuid references drawing(id) on delete set null,
  weld_number text not null,
  execution_class_id uuid not null references execution_class(id),
  material_lot_id uuid references material_lot(id) on delete set null,
  wps_id uuid not null references wps(id),
  welder_id uuid not null references person(id),
  welded_at date,
  ndt_required boolean not null default false,
  status weld_status not null default 'pianificata',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, weld_number)
);
create index idx_weld_project_status on weld(project_id, status);
create trigger trg_weld_updated_at before update on weld
  for each row execute function set_updated_at();

create table weld_inspection (
  id uuid primary key default uuid_generate_v4(),
  weld_id uuid not null references weld(id) on delete cascade,
  inspection_type inspection_type not null,
  inspector_id uuid references person(id) on delete set null,
  inspection_date date not null,
  result conformity_result not null,
  report_file_id uuid references file_attachment(id) on delete set null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_inspection_weld on weld_inspection(weld_id);

create table ce_dossier (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references project(id) on delete cascade,
  execution_class_id uuid references execution_class(id),
  status dossier_status not null default 'aperto',
  declaration_file_id uuid references file_attachment(id) on delete set null,
  ce_label_file_id uuid references file_attachment(id) on delete set null,
  approved_by uuid references person(id) on delete set null,
  approved_at date,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id)
);
create trigger trg_ce_dossier_updated_at before update on ce_dossier
  for each row execute function set_updated_at();

-- ============================================================================
-- Regole di blocco saldatura
-- ============================================================================
create or replace function enforce_weld_authorization()
returns trigger
language plpgsql
as $$
declare
  v_project record;
  v_drawing record;
  v_wps record;
  v_wpqr_count integer;
  v_welder_q record;
  v_material record;
begin
  if new.status = 'autorizzata' and (old.status is null or old.status <> 'autorizzata') then
    select * into v_project from project where id = new.project_id;
    if v_project is null or v_project.status not in ('aperta','in_corso') then
      raise exception 'Saldatura %: commessa non aperta/in corso', new.weld_number;
    end if;
    if new.execution_class_id is null then
      raise exception 'Saldatura %: classe EXC mancante', new.weld_number;
    end if;
    if new.drawing_id is null then
      raise exception 'Saldatura %: disegno mancante', new.weld_number;
    end if;
    select * into v_drawing from drawing where id = new.drawing_id;
    if v_drawing.status <> 'attivo' or v_drawing.approved_at is null then
      raise exception 'Saldatura %: disegno non approvato', new.weld_number;
    end if;
    select * into v_wps from wps where id = new.wps_id;
    if v_wps.status <> 'valida' then
      raise exception 'Saldatura %: WPS % non valida (stato=%)', new.weld_number, v_wps.code, v_wps.status;
    end if;
    select count(*) into v_wpqr_count from wpqr
      where wps_id = new.wps_id and status = 'valida'
        and (expiry_date is null or expiry_date >= current_date);
    if v_wpqr_count = 0 then
      raise exception 'Saldatura %: WPS % non ha una WPQR valida collegata', new.weld_number, v_wps.code;
    end if;
    select * into v_welder_q from welder_qualification
      where person_id = new.welder_id
        and welding_process_id = v_wps.welding_process_id
        and status = 'valida'
        and expiry_date >= current_date
      order by expiry_date desc limit 1;
    if v_welder_q is null then
      raise exception 'Saldatura %: saldatore non qualificato per processo della WPS o qualifica scaduta', new.weld_number;
    end if;
    if new.material_lot_id is not null then
      select * into v_material from material_lot where id = new.material_lot_id;
      if v_material.status in ('bloccato','non_conforme') then
        raise exception 'Saldatura %: materiale lotto bloccato/NC', new.weld_number;
      end if;
    end if;
  end if;

  if new.status in ('controllata','accettata') and (old.status is null or old.status not in ('controllata','accettata')) then
    if not exists (
      select 1 from weld_inspection
      where weld_id = new.id and inspection_type = 'VT' and result = 'conforme' and active = true
    ) then
      raise exception 'Saldatura %: controllo VT conforme mancante', new.weld_number;
    end if;
    if new.ndt_required and not exists (
      select 1 from weld_inspection
      where weld_id = new.id and inspection_type in ('PT','MT','UT','RT') and result = 'conforme' and active = true
    ) then
      raise exception 'Saldatura %: CND richiesto ma nessun controllo non distruttivo conforme registrato', new.weld_number;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_weld_enforce
  before insert or update on weld
  for each row execute function enforce_weld_authorization();

create or replace function enforce_dossier_closure()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('approvato','consegnato') and (old.status is null or old.status not in ('approvato','consegnato')) then
    if exists (
      select 1 from non_conformity nc
      join weld w on w.project_id = new.project_id
      where nc.status <> 'chiusa' and nc.active = true
    ) then
      raise exception 'Dossier CE %: non chiudibile, presenti NC aperte sulla commessa', new.id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_dossier_enforce
  before update on ce_dossier
  for each row execute function enforce_dossier_closure();
