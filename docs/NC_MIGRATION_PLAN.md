# NC Migration Plan — ERP `non_conformities` ↔ Quality `non_conformity`

**Versione:** v1.0 (2026-05-25)
**Scope:** decisione strategica sulle Non Conformità duplicate tra ERP (32 colonne, 0 record) e Quality (28 colonne, 1 record). Le NC sono **atti legali/qualità**, non si toccano alla leggera.

**Premessa**: oggi ERP `non_conformities` è vuota ma UI rimossa (commit `639dec3`). Quality `non_conformity` è master ed è alimentata via Quality `/non-conformities` UI. Tuttavia ci sono **riferimenti residui ERP**:
- `/kpi/page.tsx` legge `non_conformities` per dashboard KPI ERP
- `/backup/page.tsx` esporta `non_conformities`
- `quality_audits.id` FK in entrata su `non_conformities.related_audit_id`

---

## 1. Confronto schema

### ERP `non_conformities` — 32 colonne, schema "amministrativo+operativo"

```
id, nc_number, detected_date, closed_date,
source, category, severity,
company_id, project_id, site_id,
related_supplier_id, related_audit_id, related_intervention_id,
reported_by_employee_id, responsible_employee_id,
description, root_cause,
immediate_action, corrective_action, preventive_action,
effectiveness_check,
estimated_cost, actual_cost,
status,
documents_url, photos_url, notes,
created_by, closed_by,
created_at, updated_at, deleted_at
```

**Caratteristica**: workflow PDCA completo (cause → azione immediata → correttiva → preventiva → check efficacia), costi, link a supplier/audit/intervento.

### Quality `non_conformity` — 28 colonne, schema "qualità ISO"

```
id, code, severity, title, description,
company_id, project_id, process_id,
requirement_id, audit_id, finding_id,
detected_at, detected_by, responsible_id,
status, closed_at, closed_by,
active,
created_at, updated_at,
created_by, updated_by,
deleted_at, deleted_by, delete_reason,
reviewed_by, reviewed_at,
revision_number
```

**Caratteristica**: NC certificabile ISO (revision_number, reviewed_by/at per firma applicativa, delete_reason obbligatorio, link a requirement/finding/process).

### Differenze chiave

| Aspetto | ERP `non_conformities` | Quality `non_conformity` |
|---------|------------------------|--------------------------|
| Numerazione | `nc_number` (text libero) | `code` (text libero) |
| Causa root | `root_cause` text | demandato a `corrective_action` separato |
| Workflow azioni | inline (4 campi text) | tabella `corrective_action` separata con propri timestamp |
| Link supplier | `related_supplier_id` UUID | via `audit_id` → `audit.supplier_id` |
| Costo | `estimated_cost, actual_cost` | via `loss_event.cost_estimated/confirmed` separato |
| Site granularity | `site_id` | non presente (Quality non gestisce site separato) |
| Reporter | `reported_by_employee_id` (FK employees ERP) | `detected_by` (FK person Quality) |
| Documenti | `documents_url, photos_url` (text) | via `file_attachment` + `live_evidence` separati |
| Revisioni | — | `revision_number, reviewed_by/at` (audit trail ISO) |
| Soft delete reason | `deleted_at` | `deleted_at + deleted_by + delete_reason` |

**Conclusione strutturale**: Quality è il modello più **certificabile** (revisioni, reason obbligatorio, audit log, requirement/finding linkato). ERP è più **diretto** (workflow PDCA in 1 record, costi inline).

---

## 2. Domande aperte (decisione direzione)

### Q1 — Le NC future devono essere create dove?
- [ ] **Solo Quality** (via UI `/non-conformities`). ERP non ha più UI NC. Allineato a `ERP_QUALITY_DUPLICATION_AUDIT.md`.
- [ ] **In entrambi via sync**. Più complicato, no valore aggiunto. ❌
- [ ] **In ERP per amministrativo, in Quality per qualità ISO**. Le NC qualità non sono divisibili: una NC è UNA. ❌

**Raccomandazione:** opzione 1.

### Q2 — Le NC storiche ERP (oggi 0 record) servono per audit storico?
- [ ] Sì → mantenere `non_conformities` ERP read-only, frozen
- [ ] No → backup CSV + drop tabella

Oggi 0 record → la decisione è puramente architetturale. Se l'utente garantisce che non popolerà più la tabella, si può droppare a fine refactor.

### Q3 — Schema migration: campi ERP che non sono in Quality
| Campo ERP | Dove vive in Quality? |
|-----------|------------------------|
| `nc_number` (text) | mappato in `code` |
| `source`, `category` | NON presenti — perdita semantica |
| `site_id` | NON presente — Quality non gestisce site (solo project) |
| `related_supplier_id` | indiretto via audit/checklist |
| `related_intervention_id` | NON presente |
| `reported_by_employee_id` | mappato in `detected_by` ma serve mapping ERP.employees → Quality.person |
| `root_cause`, `immediate_action`, `corrective_action`, `preventive_action`, `effectiveness_check` | demandato a `corrective_action` (tabella separata Quality) |
| `estimated_cost`, `actual_cost` | demandato a `loss_event` (tabella separata Quality) |
| `documents_url`, `photos_url` | demandato a `file_attachment` + `live_evidence` |

**Conclusione:** Quality copre tutti i campi ERP ma in modo **normalizzato** (più tabelle invece di una). La migrazione 1:1 NON è banale: serve creare 1 `non_conformity` + 1 `corrective_action` + 1 `loss_event` + N `file_attachment`/`live_evidence` per ogni NC ERP.

Se le NC ERP sono 0 record → migrazione è zero lavoro.

---

## 3. Piano di azione (proposta)

### Fase A — Refactor codice ERP (dipendenze attive)
1. **`/kpi/page.tsx`**: rimuovere `supabase.from("non_conformities")` → leggere Quality via endpoint o mostrare "Vai a Quality KPI".
2. **`/backup/page.tsx` + `BackupClient.tsx`**: rimuovere `non_conformities` e `supplier_qualifications` dall'elenco backup quando confermiamo drop.

### Fase B — Sync inbound NC Quality → ERP (opzionale, low-risk)
Se direzione vuole che ERP veda riferimento alle NC anche senza UI:
- Aggiungere endpoint Quality `/api/integrations/erp/non-conformities/[supplier_global_id]` che ritorna lista NC aperte per quel fornitore
- ERP `/fornitori/[id]` mostra "🛡 N NC aperte in Quality →" cliccabile
- Niente sync dati, solo deep-link

### Fase C — Decisione drop tabella ERP `non_conformities`

#### Opzione C.1 — Conservativa: read-only frozen
```sql
-- Revoca permessi insert/update/delete a authenticated
REVOKE INSERT, UPDATE, DELETE ON non_conformities FROM authenticated;
-- Solo service_role + admin possono scrivere
-- Mantenere RLS attiva
COMMENT ON TABLE non_conformities IS
  'LEGACY READ-ONLY. NC ufficiali in Quality `non_conformity`. Da non scrivere.';
```
**Pro:** nessun drop, audit storico preservato, retention legale.
**Contro:** tabella vuota inutile, confonde dev futuri.

#### Opzione C.2 — Backup + drop
```sql
-- Pre-drop backup
COPY non_conformities TO '/backups/non_conformities_pre_drop.csv';
-- Poi drop dopo Fase A completata
DROP TABLE non_conformities CASCADE;  -- droppa anche FK quality_audits.related_audit_id
```
**Pro:** schema pulito, no confusione.
**Contro:** non reversibile (richiede restore se servono dati storici).

**Raccomandazione:** **Opzione C.1 (frozen read-only)** finché non passano 6 mesi senza nuovi insert. Poi Opzione C.2 con backup.

---

## 4. Conflitti potenziali

### CF1 — NC create in Quality non visibili a contabilità ERP
**Scenario:** NC con `estimated_cost=5000` chiusa in Quality. ERP non sa che ha un costo da imputare.

**Mitigazione:**
- Quality push event `non_conformity.closed_with_cost` → ERP `quality_inbound_log` aggiunge categoria `nc_cost`
- ERP `/cash-flow` legge da cache (oggi non esiste)
- Oppure: vista aggregata cross-DB `v_nc_costs_to_book` (Fase 2 matrimonio)

### CF2 — Numerazione NC condivisa o separata?
**Oggi:** Quality usa `code` (es. "NC-2026-001"), ERP usava `nc_number` (es. "NC/2026/001").

**Decisione:** Quality master genera il code. ERP non deve emettere numerazione propria.

### CF3 — Audit legale "chi ha creato la NC"
**Oggi:** Quality `non_conformity.detected_by` = `person.id` Quality.
**Problema:** se il dipendente ha account ERP `employees.id` ma non `person.id` Quality, non può apparire come reporter.

**Mitigazione:** vedi `DATA_OWNERSHIP_MATRIX.md` sez. 5 — strategia auth/SSO unificata.

---

## 5. Decisione richiesta

Per procedere ho bisogno di queste 3 scelte:

| # | Domanda | Opzioni |
|---|---------|---------|
| 1 | Le NC ERP devono diventare frozen read-only o droppate? | **C.1** (frozen) consigliato / C.2 (drop+backup) |
| 2 | Vogliamo endpoint Quality `/non-conformities/[supplier]` per deep-link da ERP? | Sì (Fase B) / No |
| 3 | Cost reporting NC: oggi resta separato; vogliamo bridge `nc_cost` per ERP? | Sì (Fase 2 matrimonio) / No (status quo) |

Senza queste decisioni il piano resta sospeso. Non eseguo niente.

---

## 6. Cosa NON fare

- ❌ **NON droppare** `non_conformities` ERP ora — codice attivo in `/kpi` e `/backup`
- ❌ **NON migrare** 0 record (non ce ne sono) — la migrazione vera è di codice ERP, non di dati
- ❌ **NON tentare schema mirror** ERP→Quality (sono normalizzati diversamente, fallirebbe)
- ❌ **NON modificare** `quality_audits.id` FK senza prima decidere il destino di `non_conformities` (FK cascade rischia)

---

## 7. Riferimenti

- [`docs/ERP_QUALITY_DUPLICATION_AUDIT.md`](./ERP_QUALITY_DUPLICATION_AUDIT.md) sez. 2 (D3)
- [`docs/DATA_OWNERSHIP_MATRIX.md`](./DATA_OWNERSHIP_MATRIX.md) sez. 2.2 (NC master Quality)
- [`docs/LEGACY_TABLES_USAGE_REPORT.md`](./LEGACY_TABLES_USAGE_REPORT.md) sez. 4.2 e 4.3
