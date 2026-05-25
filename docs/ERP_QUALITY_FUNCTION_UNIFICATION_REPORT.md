# ERP ↔ Quality — Function Unification Report (Fase 2)

**Versione:** v1.0 (2026-05-25)
**Scope:** ogni funzione operativa duplicata tra ERP e Quality deve avere **un solo master**. L'altra app può solo: leggere via API, mostrare widget, deep-link al master.

**Stato:** Fase 2 in chiusura. Nessuna fusione DB. Nessuna cancellazione storica.

---

## 1. Funzioni unificate

| # | Funzione | Vecchia ERP | Nuovo master | Stato ERP dopo Fase 2 | Codice ERP rimosso/refactor |
|---|----------|-------------|--------------|------------------------|------------------------------|
| 1 | **Qualifica fornitore** | `/fornitori-qualita`, `/fornitori/[id]/qualifica`, `qualification_settings` form `/impostazioni` | **Quality** `supplier_qualification` | Read-only cache `counterparties.quality_*` + widget iframe + deep-link | Step F (`639dec3`), Step A1+A2+A3 (`3f0bfd7`), Step B refactor `/acquisti/[id]` (`3635f2d`), F2-2 banner `/documenti` |
| 2 | **Non conformità** | `/non-conformita`, `/non-conformita/nuova` UI | **Quality** `non_conformity` | UI ERP rimossa. Tabella `non_conformities` **read-only** (Fase 2 RLS lock) | Step F cleanup UI; F2-5 RLS lock-down |
| 3 | **Documenti qualità ISO** | categorie `procedura/certificazione/durc` in `/documenti` ERP miscelate | **Quality** `document` + `document_revision` + `file_attachment` | Banner chiarisce scope: ERP = amministrativi; Quality = qualità ISO | F2-2 banner |
| 4 | **Scadenze qualità (certificazioni)** | `quality_certification` source in `/scadenze` linkava `/qualita/certificazioni` (rotto) | **Quality** `calendar_event`, `reminder`, `quality_event_log` | Source link reindirizza a Quality `/quality-sentinel/certifications?source=erp` | Step F4 (commit `639dec3`) |
| 5 | **Audit interni / ispezioni** | `/qualita/audit`, tabella `quality_audits` | **Quality** `audit` + `audit_checklist` + `audit_finding` | UI ERP rimossa Step F. Tabella read-only Fase 2 | Step F cleanup UI; F2-5 RLS lock |
| 6 | **Procedure operative** | `/qualita/procedure`, `quality_procedures` | **Quality** `document` + `process_instruction` + `procedure_format_link` | UI ERP rimossa Step F. Tabella read-only Fase 2 (e vuota, droppabile Step C) | Step F cleanup UI; F2-5 RLS lock |
| 7 | **KPI / indicatori qualità** | `/qualita/indicatori`, `quality_kpi`, `v_quality_kpi_status` | **Quality** `quality_score`, `quality_score_snapshot`, dashboard live | UI ERP rimossa Step F. Banner "🛡 Apri Quality KPI" in `/kpi`. Vista droppata Step B | Step A1 (`3f0bfd7`); Step B drop vista (`3635f2d`); F2-5 RLS lock tabella |
| 8 | **Certificazioni ISO 9001/45001/14001** | `/qualita/certificazioni`, `quality_certifications` | **Quality** `standard`, `national_requirement`, `ce_dossier`, `document` | UI ERP rimossa Step F. Tabella read-only Fase 2 | Step F cleanup UI; F2-5 RLS lock |

---

## 2. Funzioni rimaste in **doppia catena** (intenzionali, da linkare con FK)

Queste NON sono duplicazioni operative ma workflow paralleli con responsabilità diverse:

| Funzione | ERP | Quality | Decisione |
|----------|-----|---------|-----------|
| **Acquisti** | `purchase_requests/orders/invoices` (amministrativo) | `material_request/order/reception/nc/loss` (esecutivo cantiere + qualità) | Tenere separato, linkare con FK `*.erp_*_id` (Fase 2.6 successiva) |
| **Manutenzioni** | `vehicle_interventions` (flotta) | `asset_intervention` (strumenti tarati ISO) | Tenere separato, no fusione - entità diverse |
| **Formazione** | `training_sessions/courses` (HR formale) | `competence/training_event` (qualifiche operative ISO) | Tenere separato, linkare via `person.employee_id` |

---

## 3. Funzioni rimaste **separate per dominio** (non fondere mai)

| Funzione | ERP | Quality |
|----------|-----|---------|
| Utenti / auth | `profiles` + `auth.users` ERP | `person` + `auth.users` Quality (project separato) |
| Ruoli | `profiles.role` (gestionale) | `role` + `role_permission` (ISO/RBAC) |
| Notifiche | `alerts`, `notification_recipients` | `notification` family (8 tabelle) |
| Audit log | `audit_logs` + audit specifici | `audit_log` + `entity_revision` + `applicative_signature` |

Vedi `DATA_OWNERSHIP_MATRIX.md` per giustificazione.

---

## 4. Checklist criteri di accettazione Fase 2

- [x] Nessuna doppia funzione operativa attiva
- [x] ERP non permette più scritture quality legacy (RLS Fase 2 + UI rimossa)
- [x] Quality è master per tutte le funzioni qualità
- [x] ERP mostra solo stato sintetico / link / widget
- [x] Nessun dato storico cancellato
- [x] Typecheck pulito (solo 3 errori pre-esistenti `movimenti/`)
- [x] Report aggiornati (questo file + 2 paralleli)
- [x] Commit separato (Fase 2 file system + Fase 2 DB migration)
- [x] Push completato

---

## 5. Cosa NON è in questa Fase 2

- ❌ DROP TABLE delle 7 tabelle legacy (Step C, attesa approvazione)
- ❌ Migrazione NC storiche (`NC_MIGRATION_PLAN.md`, attesa criteri)
- ❌ Fusione auth/SSO (Fase 3 futura)
- ❌ Unione DB project Supabase (mai)
- ❌ Cancellazione storico ERP (mai)

---

## 6. Documenti correlati

- [`DATA_OWNERSHIP_MATRIX.md`](./DATA_OWNERSHIP_MATRIX.md) — chi è master per cosa
- [`ERP_QUALITY_DUPLICATION_AUDIT.md`](./ERP_QUALITY_DUPLICATION_AUDIT.md) — 23 duplicazioni mappate
- [`LEGACY_TABLES_USAGE_REPORT.md`](./LEGACY_TABLES_USAGE_REPORT.md) — uso reale 7 tabelle legacy
- [`NC_MIGRATION_PLAN.md`](./NC_MIGRATION_PLAN.md) — strategia NC con 3 opzioni
- [`ERP_LEGACY_WRITE_BLOCK_REPORT.md`](./ERP_LEGACY_WRITE_BLOCK_REPORT.md) — dettaglio RLS lock Fase 2
- [`ERP_QUALITY_DECOMMISSION_PLAN.md`](./ERP_QUALITY_DECOMMISSION_PLAN.md) — roadmap Step C futuro
