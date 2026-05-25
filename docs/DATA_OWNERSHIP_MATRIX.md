# Data Ownership Matrix — ERP ↔ Quality Control Plant

**Versione:** v1.0 (2026-05-25)
**Stato:** Audit Fase 1 — solo mappa, niente fusioni o cancellazioni.
**Premessa fix critico:** bug Quality `@supabase/ssr` cache (commit `7a9d6f0` Quality + `04bc6c0` ERP). Da questo momento le query server-side leggono dato fresh. Senza questo fix l'intera matrice sarebbe inaffidabile.

---

## 1. Regola fondamentale

Per ogni dato del gruppo decidiamo **un solo master**. Tutti gli altri sistemi sono **read-only / shadow / cache locale**. Il bridge sync (HMAC + sync_outbox/log) propaga in modo controllato, con conflitti tracciati e non sovrascritti.

```
MASTER   →  fonte autorevole, edita, audit
SHADOW   →  cache locale read-only sincronizzata via bridge
EXTERNAL →  l'altro sistema deve fare deep-link, niente copia
DELETE   →  duplicato senza valore, da dismettere
```

---

## 2. Master per dominio

### 2.1 Anagrafiche

| Dato | ERP | Quality | MASTER | Note |
|------|-----|---------|--------|------|
| Anagrafica fornitore (nome, P.IVA, indirizzo, IBAN) | `counterparties` (530 record) | `supplier_qualification.legal_name/tax_id/address` (2 record) | **ERP** | Quality riceve via webhook, salva minimo necessario per qualifica. ERP è la fonte fiscale/contrattuale. |
| Anagrafica cliente | `counterparties type=client/both` | — | **ERP** | Quality non gestisce clienti. |
| Anagrafica impresa gruppo | `companies` (vuota) | `company` (9 record) | **Quality (de facto)** | ERP `companies` mai popolata. Quality `company` ha 9 imprese reali. Da chiarire: ERP dovrebbe diventare master e fare push iniziale, OPPURE accettare che Quality sia master anche per anagrafica gruppo. |
| Anagrafica commessa/cantiere | `projects` (2 record), `sites` (2 record) | `project` (6 record), `site` (vuota) | **ERP** | ERP è il sistema commerciale/contabile, gestisce commessa autorevole. Quality riceve via webhook. Oggi NON sincronizzati: gap. |
| Anagrafica dipendente | `employees` (19 record), `profiles` (2) | `person` (1 record), `team_member` | **ERP** | ERP ha l'anagrafica HR completa. Quality `person` ha solo gli utenti registrati alla piattaforma. |
| Mapping auth_user → persona | `profiles.role` | `person.auth_user_id` + `role_id` | **Ognuno per i suoi utenti** | Quality e ERP hanno auth Supabase separate. Stesso utente fisico ha 2 account distinti. Vedi sez. 5. |

### 2.2 Qualità (cuore Quality)

| Dato | ERP | Quality | MASTER | Note |
|------|-----|---------|--------|------|
| Qualifica fornitore (score, status, documenti, sezioni) | `supplier_qualifications` (vuota legacy), `qualification_settings`, cache `counterparties.quality_*` | `supplier_qualification` + `qualification_document` + `supplier_score` | **Quality** | Cache su ERP via webhook receiver. **Cleanup fatto**: pagine ERP `/fornitori-qualita`, `/qualita`, `/non-conformita` eliminate, sidebar single voce → Quality. |
| Blocco ordini per qualità | — | `supplier_qualification.blocked_for_orders` | **Quality** | Gate sync `quality-status` pre-ordine ERP. ✅ funziona (Test E2E 4-check). |
| Documenti obbligatori (DURC, ISO, ...) | — | `qualification_document` | **Quality** | ERP deep-link. |
| Non conformità | `non_conformities` (vuota) | `non_conformity` + `corrective_action` + `audit_finding` | **Quality** | ERP `non_conformities` era duplicato → eliminata UI ERP. La tabella SQL resta vuota, dismettibile. |
| Audit interni / ispezioni / verifiche | `quality_audits` (vuota) | `audit` + `audit_checklist` + `audit_finding` | **Quality** | ERP `quality_audits` legacy, mai usato. |
| Procedure / istruzioni operative | `quality_procedures` (vuota) | `document` (25 record) + `process_instruction` (26) + `procedure_format_link` (75) | **Quality** | ERP legacy. |
| Certificazioni ISO (9001/45001/14001 + UNE-EN 1090) | `quality_certifications` (vuota) | `standard` (9), `national_requirement` (8), `quality_template`, `document`, `ce_dossier` | **Quality** | ERP legacy. |
| Indicatori / KPI qualità | `quality_kpi` (vuota) | `quality_score`, `quality_score_snapshot`, dashboard live | **Quality** | ERP legacy. |
| Checklist obbligatorie e fasi piano qualità | — | `quality_plan` + `quality_plan_phase` + `quality_checklist` + `quality_checklist_item` + `quality_template*` | **Quality** | ERP non gestisce. |
| Blocchi operativi qualità | — | `quality_block`, `loss_event`, `project_startup_check` | **Quality** | ERP non gestisce. |
| Evidenze foto/firma/scan live | — | `live_evidence` + `evidence_duplicate_check` + `applicative_signature` + `ocr_extraction` | **Quality** | ERP non gestisce. |
| Saldatura UNE-EN 1090 (WPS/WPQR/welder/weld) | — | `wps`, `wpqr`, `welder_qualification`, `weld`, `weld_inspection`, `welding_process`, `execution_class`, `drawing` | **Quality** | ERP non gestisce. |
| Standards / requisiti normativi | — | `standard`, `standard_requirement`, `national_requirement`, `country_rule`, `process_requirement` | **Quality** | ERP non gestisce. |

### 2.3 Operativo commerciale / amministrativo

| Dato | ERP | Quality | MASTER | Note |
|------|-----|---------|--------|------|
| Ordini fornitore (PO) | `purchase_orders` + `purchase_order_lines` | `material_order` | **ERP per la testa ordine; Quality per il lato materiali/ricezione/NC** | Oggi: due tabelle distinte non sincronizzate. Gap. Tutta la catena di acquisto in ERP, mentre Quality usa `material_request/order/reception` per il workflow di evidenza materiale. Da decidere: lasciare le 2 catene parallele (Quality fa workflow su materiale, ERP fa contabilità) o consolidare. |
| Richiesta materiali (PR) | `purchase_requests` + `purchase_request_lines` + audit | `material_request` | **Doppia catena** | ERP è il modulo Acquisti gestionale. Quality `material_request` è il workflow operativo cantiere con foto/firma. Conviene: ERP = vista amministrativa, Quality = workflow esecutivo, link via `material_request.purchase_request_id` (campo da creare). |
| DDT / ricezione fornitore | `delivery_notes` + `delivery_note_lines` | `material_reception` + `material_nc` + `material_loss` | **ERP per documento fiscale; Quality per check qualità ricezione** | Stesso pattern PR. |
| Fatture passive (PI) | `purchase_invoices` (426 record) | — | **ERP** | Quality non ha bisogno di contabilità. |
| Fatture attive | `sales_invoices` (28), `sales_invoice_lines`, `sales_orders`, `quotations` | — | **ERP** | — |
| Pagamenti / banche / movimenti | `payments` (624), `bank_accounts` (20), `bank_transactions` (624), `banks` (7), `payment_*`, `reconciliation_rules` (19) | — | **ERP** | — |
| Contratti commessa | — | `contract` (1) + `contract_clause` (3) + `technical_sheet` (1) | **Quality (clausole qualità); ERP (contratto commerciale)** | Oggi separati: ERP non ha tabella `contract`. Da chiarire se Quality deve essere master anche del contratto o solo delle clausole-rischio. |
| CRM / opportunità | `crm_pipelines` (8), `crm_deals`, `crm_activities` | — | **ERP** | — |
| Tasse / cassa / paghe | `tax_codes`, `tax_returns`, `payslips`, `payslip_components`, `journal_entries`, `accounting_periods`, `cost_categories`, `employee_cost_components` | — | **ERP** | — |
| Smart Expense / scontrini | `expense_claims` (7), `expense_receipts` (8), `expense_extractions` (8), `expense_audit_log` (16) | — | **ERP** | — |

### 2.4 Mezzi / asset / manutenzione

| Dato | ERP | Quality | MASTER | Note |
|------|-----|---------|--------|------|
| Veicoli flotta | `vehicles` (15), `vehicle_*` (gps/devices/positions/interventions/parts/meter_readings/...) | — | **ERP** | Modulo flotta è ERP. |
| Strumenti / asset misurazione | — | `asset` (25), `asset_event` (21) | **Quality** | Inventario strumenti Enemek importato in Quality. |
| Interventi manutenzione veicoli | `vehicle_interventions` (2), `vehicle_intervention_parts`, `maintenance_records` | `asset_intervention` (0) + `_part` + `_cost` + `_warranty` + `_evidence` | **Doppia catena** | ERP gestisce flotta, Quality gestisce strumenti. Schema overlap. Da consolidare: stesso pattern intervento, 2 tabelle. |
| Beni ammortizzabili | `fixed_assets` (3), `depreciation_schedule` (58) | — | **ERP** | Contabilità solo ERP. |
| Scadenze veicolo (bollo/revisione/...) | `vehicle_compliance_items` (32), `vehicle_notification_rules`, `vehicle_notifications_log`, `vehicle_documents`, `vehicle_damages`, `vehicle_assignments` | — | **ERP** | — |

### 2.5 Personale / HR / formazione

| Dato | ERP | Quality | MASTER | Note |
|------|-----|---------|--------|------|
| Dipendente anagrafica | `employees` (19) | `person` (1) | **ERP** | Vedi 2.1. |
| Mansione / ruolo aziendale | `employee_assignments`, `profiles.role` | `person.role_id` + `role` (18 ruoli RBAC) + `role_permission` (45) | **ENTRAMBI** | Mondi diversi: ERP `profiles.role` = ruolo gestionale, Quality `role` = ruoli ISO operativi (responsabile_qualita, saldatore, capo_cantiere, ecc.). Da decidere: matrimonio ruoli o restano separati. |
| Permessi UI moduli | `user_module_permissions`, `app_modules` (57) | `role_permission` (resource+action+scope) | **ENTRAMBI** | Stesso problema sopra. Visto già in pagina `/users/[id]` Quality (card permessi). |
| Ferie | `vacation_requests`, `vacation_balances` (5) | — | **ERP** | — |
| Visite mediche | `employee_medical_visits` (12), `medical_visit_types` | — | **ERP** | — |
| Formazione / corsi / partecipanti | `training_sessions`, `training_session_attendees`, `training_courses`, `employee_training_records` | `competence` (30) + `person_competence` + `training_event` + `training_attendee` | **Doppia catena** | ERP è HR-formale (corsi calendarizzati, attestati). Quality è qualità-operativa (competenze ISO, qualifiche saldatore). Da decidere: link via `person.employee_id`. |
| Timbrature / timesheet | `timesheets` (1), `time_clock_events`, `timesheet_audit_log` (3) | — | **ERP** | — |

### 2.6 Documenti / scadenze

| Dato | ERP | Quality | MASTER | Note |
|------|-----|---------|--------|------|
| Documenti amministrativi (contratti, fatture PDF, scansioni) | `documents` (vuota) | `document` (25), `document_revision` (25), `file_attachment` (25) | **Quality** | ERP `documents` non popolata. Quality è il document management ufficiale del gruppo (con versioning). |
| Scadenze fiscali/societarie | `tax_returns`, `company_borme_events` | — | **ERP** | — |
| Scadenze qualità | — | `quality_event_log`, `quality_score_snapshot`, `reminder`, `reminder_emission`, `calendar_event` | **Quality** | — |

### 2.7 AI / chat / report

| Dato | ERP | Quality | MASTER | Note |
|------|-----|---------|--------|------|
| Conversazioni AI utente | `ai_chat_conversations` (1) + `ai_chat_messages` (2), `ai_reports` | — | **ERP** | Modulo AI Leonardo solo lato ERP. |

### 2.8 Notifiche / audit / sync

| Dato | ERP | Quality | MASTER | Note |
|------|-----|---------|--------|------|
| Notifiche utente | `alerts`, `notification_recipients`, `vehicle_notifications_log`, `deadline_alerts_log` | `notification` (8), `notification_recipient` (6), `notification_delivery`, `notification_action`, `message_template`, `popup_rule`, `popup_dismissal` | **ENTRAMBI** | Ogni app notifica i suoi eventi ai suoi utenti. Mai unire: utenti separati, eventi separati. Bridge solo per eventi cross (es. "Quality ha bloccato il fornitore X → notifica al responsabile ordini ERP"). |
| Audit log | `audit_logs`, `expense_audit_log` (16), `payment_audit_log`, `purchase_request_audit_log`, `timesheet_audit_log` (3) | `audit_log` (15), `entity_revision`, `applicative_signature`, `quality_event_log` (11) | **ENTRAMBI (separati per dominio)** | Mai unire: ogni app ha audit ISO/legale dei suoi atti. Eventualmente: view aggregata `v_group_audit_log` per direzione. |
| Bridge sync ERP↔Quality | `quality_inbound_log` (3, ⚠️ RLS off) | `sync_outbox` (1), `sync_log` (17), `sync_conflict` (1), `integration_mapping` (1) | **N/A — entrambi tengono il loro lato bridge** | ✅ funzionante. Vedi sez. 4. |
| ID condiviso | `counterparties.global_id` (uuid) | `supplier_qualification.global_id` (text) | **N/A — generato da una sola parte** | global_id è UUID generato lato ERP nella migration counterparties; Quality lo accetta come testo. |

---

## 3. Riepilogo decisioni di principio

```
ERP è master per:
  - anagrafica fiscale (counterparties)
  - commesse / cantieri (projects, sites)
  - HR formale (employees, vacation, medical, timesheet, payroll)
  - flotta veicoli
  - contabilità completa (fatture, pagamenti, banche, tasse)
  - CRM / smart expense
  - AI chat / report

Quality è master per:
  - qualifica fornitore (score, blocco, documenti)
  - NC, audit, ispezioni, azioni correttive
  - procedure / standard / certificazioni ISO
  - piano qualità + checklist + evidenze
  - saldatura UNE-EN 1090
  - inventario strumenti misurazione
  - competenze operative ISO + qualifiche saldatore
  - bridge sync log/outbox/conflict

ENTRAMBI (separati per dominio):
  - utenti / auth / permessi (mondi separati, mai unire)
  - notifiche / audit (separati per atto)
  - ruoli (gestionale vs ISO)

DOPPIA CATENA, da consolidare con link:
  - ordini fornitore (PO ERP ↔ material_order Quality)
  - richieste materiali (PR ERP ↔ material_request Quality)
  - DDT ricezione (delivery_notes ERP ↔ material_reception Quality)
  - manutenzioni (vehicle_interventions ERP ↔ asset_intervention Quality)
  - formazione (training_* ERP ↔ competence Quality)

LEGACY da dismettere (ERP, già scollegate via UI):
  - quality_audits, quality_certifications, quality_procedures,
    quality_kpi, non_conformities, supplier_qualifications,
    qualification_settings
```

---

## 4. Bridge sync — stato post-fix

| Aspetto | Stato | Note |
|---------|-------|------|
| HMAC firmato bidirezionale | ✅ | Stesso `QUALITY_INTEGRATION_SECRET` su entrambi |
| Webhook ERP→Quality `/api/integrations/erp/webhook` | ✅ | Dedup via `sync_log.idempotency_key`. PROTECTED_FIELDS bloccati. |
| Quality-status ERP→Quality `/api/integrations/erp/suppliers/[gid]/quality-status` | ✅ post fix `7a9d6f0` | Fail-closed se Quality offline. |
| Push Quality→ERP `/api/integrations/erp/push` (cron) | ✅ | Outbox pattern. |
| Receiver Quality→ERP `/api/integrations/quality/inbound` | ✅ | Idempotency via `quality_inbound_log`. |
| Widget iframe Quality embed ERP `/embed/supplier-status/[gid]?ts&sig` | ✅ | URL firmato 5min freshness. |
| Conflitti su campo protetto | ✅ | `sync_conflict` tracciati, da risolvere manualmente in `/integrations/erp-quality`. |
| **Aperto**: `quality_inbound_log` su ERP ha RLS disabilitato | ⚠️ | Advisory critico. Abilitare RLS o restringere lo schema. |

---

## 5. Punto critico: utenti separati, stessa persona fisica

Quality e ERP hanno **due project Supabase distinti** quindi due `auth.users` distinte. Lo stesso operatore deve loggarsi due volte: una in ERP, una in Quality.

**Conseguenze:**
- Non c'è SSO né shared session
- Audit log di una persona è frammentato (Quality audit_log + ERP audit_log + expense_audit_log ecc.)
- Notifiche cross richiedono mapping `quality.person.email = erp.profiles.email` (non garantito)

**Opzioni (da decidere in Fase 2):**
1. **Unione auth via OAuth shared provider** (Microsoft / Google / Azure AD) — niente fusione DB, ma SSO trasparente
2. **One ring auth** — un solo project Supabase con `auth.users` condiviso e schemi separati. Complesso ma chiude il problema
3. **Status quo + mapping email** — niente SSO, ma viewer aggregato `/admin/group-audit-log` che mostra audit di tutti i sistemi via email

---

## 6. Azioni proposte (NON eseguite, decisione tua)

| # | Azione | Rischio | Reversibile |
|---|--------|---------|-------------|
| 1 | Abilitare RLS su `quality_inbound_log` (ERP) con policy `service_role only` | basso | sì |
| 2 | Backfill ERP→Quality di tutti i 530 counterparties supplier per popolare Quality con anagrafica completa | medio (530 webhook) | sì (delete by source_app='erp') |
| 3 | Backfill Quality→ERP cache `quality_*` per i supplier già qualificati | basso | sì |
| 4 | Tabelle legacy ERP (`quality_audits/quality_certifications/quality_procedures/quality_kpi/non_conformities/supplier_qualifications/qualification_settings`): export → drop | medio | no (serve backup) |
| 5 | Aggiungere FK `material_request.purchase_request_id` per linkare Quality←→ERP catene materiali | basso | sì |
| 6 | Decidere se aggiungere endpoint `companies/projects/sites` sync bidirezionale (oggi NON sincronizzati) | medio | sì |
| 7 | Decidere strategia auth/SSO unica (opzioni sez. 5) | alto | dipende dall'opzione |
| 8 | Vista aggregata `v_group_audit_log` per direzione | basso | sì |

---

## 7. Cosa NON fare

- ❌ **Fondere DB Quality e ERP**: 2 schemi maturi, RLS divergenti, downtime garantito, audit log a rischio
- ❌ **Migrare massivamente dati senza backup**
- ❌ **Eliminare le tabelle legacy ERP qualità senza export preventivo** (anche se UI già scollegata)
- ❌ **Toccare il bridge sync_outbox/log/conflict** ora che è verificato funzionante
- ❌ **Promuovere a master dati senza completare il backfill** (es. eliminare ERP `counterparties.email` prima che Quality abbia tutti i record)

---

## 8. Test minimo prima di qualsiasi azione

Per ogni azione proposta in sez. 6:
1. Backup DB target
2. Esecuzione su PR/branch separato
3. Smoke test E2E equivalente al 4-check del 2026-05-25 (vedi `ERP_QUALITY_DUPLICATION_AUDIT.md` sez. 5)
4. Approvazione direzione gruppo prima del merge in main
