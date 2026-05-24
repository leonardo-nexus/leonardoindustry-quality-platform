-- ============================================================================
-- Seed iniziale - Leonardoindustry Quality Platform
-- ============================================================================

-- Gruppo
insert into company_group (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Leonardoindustry')
on conflict (name) do nothing;

-- 9 imprese placeholder
insert into company (group_id, name, country) values
  ('00000000-0000-0000-0000-000000000001', 'Impresa 1', 'ES'),
  ('00000000-0000-0000-0000-000000000001', 'Impresa 2', 'ES'),
  ('00000000-0000-0000-0000-000000000001', 'Impresa 3', 'ES'),
  ('00000000-0000-0000-0000-000000000001', 'Impresa 4', 'IT'),
  ('00000000-0000-0000-0000-000000000001', 'Impresa 5', 'IT'),
  ('00000000-0000-0000-0000-000000000001', 'Impresa 6', 'ES'),
  ('00000000-0000-0000-0000-000000000001', 'Impresa 7', 'ES'),
  ('00000000-0000-0000-0000-000000000001', 'Impresa 8', 'IT'),
  ('00000000-0000-0000-0000-000000000001', 'Impresa 9', 'ES')
on conflict (group_id, name) do nothing;

-- Ruoli
insert into role (code, name, description, is_group_level) values
  ('admin_gruppo', 'Admin Gruppo', 'Accesso completo a tutte le imprese', true),
  ('direzione_gruppo', 'Direzione Gruppo', 'Vista cross-impresa, approvazione escalation', true),
  ('direzione_impresa', 'Direzione Impresa', 'Gestione impresa, approvazione documenti, riesame', false),
  ('responsabile_qualita', 'Responsabile Qualità', 'Sistema qualità, documenti, audit, NC, indicatori', false),
  ('responsabile_sicurezza', 'Responsabile Sicurezza', 'Sistema SSL, rischi, formazione SSL, incidenti', false),
  ('responsabile_ambiente', 'Responsabile Ambiente', 'Aspetti ambientali, consumi, rifiuti', false),
  ('responsabile_saldatura', 'Responsabile Saldatura', 'Coordinamento saldatura, WPS, qualifiche, dossier CE', false),
  ('project_manager', 'Project Manager', 'Gestione commesse e cantieri', false),
  ('capo_officina', 'Capo Officina', 'Esecuzione operativa officina', false),
  ('capo_cantiere', 'Capo Cantiere', 'Esecuzione operativa cantiere', false),
  ('auditor', 'Auditor', 'Audit interni e di parte terza', false),
  ('operatore', 'Operatore', 'Esecuzione attività assegnate, evidenze, firme', false),
  ('fornitore', 'Fornitore', 'Caricamento documenti richiesti', false)
on conflict (code) do nothing;

-- Processi master (18)
insert into process (code, name, category) values
  ('PROC-DIR-01', 'Direzione e riesame', 'direzione'),
  ('PROC-DOC-01', 'Documentazione', 'qualita'),
  ('PROC-RIS-01', 'Rischi e opportunità', 'qualita'),
  ('PROC-COM-01', 'Clienti e contratti', 'qualita'),
  ('PROC-FOR-01', 'Fornitori e subappalti', 'fornitori'),
  ('PROC-HR-01', 'Risorse umane e formazione', 'hr'),
  ('PROC-CAN-01', 'Commesse e cantieri', 'operativo'),
  ('PROC-PRO-01', 'Produzione e controllo operativo', 'operativo'),
  ('PROC-QUA-01', 'Qualità e controlli', 'qualita'),
  ('PROC-SIC-01', 'Sicurezza e salute sul lavoro', 'sicurezza'),
  ('PROC-AMB-01', 'Ambiente e consumi', 'ambiente'),
  ('PROC-INF-01', 'Infrastrutture e strumenti', 'operativo'),
  ('PROC-EME-01', 'Emergenze e antincendio', 'sicurezza'),
  ('PROC-INC-01', 'Incidenti e quasi incidenti', 'sicurezza'),
  ('PROC-NC-01', 'Non conformità e azioni', 'qualita'),
  ('PROC-AUD-01', 'Audit', 'qualita'),
  ('PROC-IND-01', 'Indicatori e obiettivi', 'qualita'),
  ('PROC-SAL-01', 'UNE-EN 1090 e saldatura', 'saldatura')
on conflict (code) do nothing;

-- Norme
insert into standard (code, version, title) values
  ('ISO 9001', '2015', 'Sistemi di gestione per la qualità'),
  ('ISO 45001', '2018', 'Sistemi di gestione per la salute e sicurezza sul lavoro'),
  ('ISO 14001', '2015', 'Sistemi di gestione ambientale'),
  ('UNE-EN 1090-1', '2009+A1:2011', 'Esecuzione strutture acciaio e alluminio - Requisiti CE'),
  ('UNE-EN 1090-2', '2018', 'Esecuzione strutture in acciaio - Requisiti tecnici'),
  ('ISO 3834-2', '2021', 'Requisiti di qualità per saldatura - Requisiti estesi'),
  ('ISO 9606-1', '2017', 'Qualificazione saldatori - Acciai'),
  ('ISO 15614-1', '2017', 'Specificazione e qualificazione procedure saldatura'),
  ('ISO 15609-1', '2019', 'Specificazione e qualificazione WPS - Acciai')
on conflict (code, version) do nothing;

-- Classi di esecuzione
insert into execution_class (code, description) values
  ('EXC1', 'Classe 1 - Componenti strutturali di tipo non rilevante'),
  ('EXC2', 'Classe 2 - Strutture ordinarie - Edifici di altezza limitata'),
  ('EXC3', 'Classe 3 - Strutture con requisiti elevati - Ponti, edifici alti'),
  ('EXC4', 'Classe 4 - Strutture critiche - Conseguenze gravi in caso di rottura')
on conflict (code) do nothing;

-- Processi saldatura ISO 4063
insert into welding_process (code, name) values
  ('111', 'Saldatura ad arco con elettrodo rivestito (SMAW)'),
  ('114', 'Saldatura ad arco con filo animato senza gas'),
  ('121', 'Saldatura ad arco sommerso (SAW)'),
  ('131', 'Saldatura MIG (gas inerte)'),
  ('135', 'Saldatura MAG con filo pieno'),
  ('136', 'Saldatura MAG con filo animato'),
  ('138', 'Saldatura MAG con filo animato metallico'),
  ('141', 'Saldatura TIG (TIG-DC)'),
  ('143', 'Saldatura TIG con filo animato'),
  ('15', 'Saldatura plasma')
on conflict (code) do nothing;

-- Competenze iniziali
insert into competence (name, category, requires_expiry) values
  ('Responsabile qualità', 'qualita', false),
  ('Responsabile sicurezza', 'sicurezza', false),
  ('Responsabile ambiente', 'ambiente', false),
  ('Responsabile saldatura (IWE/IWT/IWS)', 'saldatura', false),
  ('Auditor interno ISO 9001', 'qualita', true),
  ('Auditor interno ISO 45001', 'sicurezza', true),
  ('Auditor interno ISO 14001', 'ambiente', true),
  ('Project Manager', 'operativo', false),
  ('Saldatore processo 111', 'saldatura', true),
  ('Saldatore processo 135', 'saldatura', true),
  ('Saldatore processo 136', 'saldatura', true),
  ('Saldatore processo 141', 'saldatura', true),
  ('Controllo visivo VT (UNI EN ISO 9712)', 'saldatura', true),
  ('Controllo PT (UNI EN ISO 9712)', 'saldatura', true),
  ('Controllo MT (UNI EN ISO 9712)', 'saldatura', true),
  ('Controllo UT (UNI EN ISO 9712)', 'saldatura', true),
  ('Controllo RT (UNI EN ISO 9712)', 'saldatura', true),
  ('Addetto emergenze', 'sicurezza', true),
  ('Addetto antincendio rischio basso', 'sicurezza', true),
  ('Addetto antincendio rischio medio', 'sicurezza', true),
  ('Addetto antincendio rischio elevato', 'sicurezza', true),
  ('Addetto primo soccorso', 'sicurezza', true),
  ('Preposto sicurezza', 'sicurezza', true),
  ('RSPP', 'sicurezza', true),
  ('Formazione generale lavoratori (Acc. Stato-Regioni)', 'sicurezza', true),
  ('Formazione specifica lavoratori', 'sicurezza', true),
  ('Uso PLE/carrelli elevatori', 'sicurezza', true),
  ('Uso gru su autocarro', 'sicurezza', true),
  ('Lavori in quota / DPI III categoria', 'sicurezza', true),
  ('Spazi confinati', 'sicurezza', true)
on conflict (name) do nothing;
