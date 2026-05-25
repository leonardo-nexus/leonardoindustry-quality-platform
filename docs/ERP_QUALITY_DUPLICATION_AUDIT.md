# ERP ↔ Quality — Duplication Audit

**Versione:** v1.0 (2026-05-25)
**Scopo:** elencare tutte le duplicazioni effettive tra Leonardo ERP Control Center (project Supabase `ndthklmimxfpiqlfxeyc`, 119 tabelle) e Leonardo Quality Control Plant (project `rdwaymddygcsfbwbqwtv`, 105 tabelle). Per ognuna: rischio, master corretto, azione consigliata.

**Non distruttivo**: questo doc è solo audit. Non vengono eseguite cancellazioni, fusioni o migrazioni in questa fase.

---

## 1. Sintesi quantitativa

| Categoria | N | Rischio aggregato |
|-----------|---|-------------------|
| Duplicazioni **GRAVI** — stesso dato, due fonti scrivibili, conflitto silente possibile | 3 | 🔴 alto |
| Duplicazioni **MEDIE** — stesso dato, fonte scrivibile diversa, manca link | 5 | 🟡 medio |
| Duplicazioni **LEGACY** — ERP ha tabelle qualità vuote/scollegate, UI già rimossa | 7 | 🟢 basso (da dismettere) |
| Duplicazioni **DIVERGENTI** — stesso nome, semantica diversa, MAI fondere | 4 | 🟢 ok (separare meglio) |
| Catene **PARALLELE** — workflow ERP + workflow Quality, da linkare con FK | 4 | 🟡 medio |

Totale duplicazioni identificate: **23**.

---

## 2. Duplicazioni GRAVI 🔴

### D1 — `companies` (ERP, vuota) vs `company` (Quality, 9 record)

| Aspetto | ERP `companies` | Quality `company` |
|---------|-----------------|-------------------|
| Record | 0 | 9 (le imprese reali del gruppo) |
| Scrivibile da | nessuno (vuota) | Quality UI |
| Conseguenza | ERP non ha anagrafica gruppo, ma 530 counterparties usano FK `companies.id` implicita (oggi NULL) |

**Master corretto:** ERP per definizione (è il sistema amministrativo gruppo). Ma oggi è vuota.

**Azione consigliata:**
1. ERP popola `companies` con le 9 imprese (manuale o import da Quality)
2. ERP diventa master, Quality riceve push iniziale via webhook
3. Aggiungere endpoint `/api/integrations/erp/companies/[globalId]` simmetrico a quality-status

**Rischio se non risolto:** counterparties.company_id NULL, fatture/ordini senza azienda emittente.

### D2 — `employees` (ERP, 19) vs `person` (Quality, 1)

| Aspetto | ERP `employees` | Quality `person` |
|---------|-----------------|------------------|
| Record | 19 (HR completa) | 1 (solo utente registrato a Quality) |
| Scrivibile da | ERP HR module | Quality `/users/new` |
| Conseguenza | Stesso dipendente fisico esiste in 2 record con id diversi; nessun link |

**Master corretto:** ERP per anagrafica (legalmente è HR). Quality riceve solo gli operatori che usano la piattaforma qualità.

**Azione consigliata:**
1. Aggiungere `person.employee_id` (uuid nullable) su Quality
2. Endpoint `/api/integrations/erp/employees/[globalId]` sync verso Quality
3. Quality `person.role` resta indipendente (RBAC ISO), ERP `profiles.role` resta indipendente (RBAC gestionale)

**Rischio se non risolto:** chi compila checklist Quality non è collegato all'anagrafica HR. Niente firma ufficiale dipendente.

### D3 — `non_conformities` (ERP, vuota) vs `non_conformity` (Quality, 1)

| Aspetto | ERP `non_conformities` | Quality `non_conformity` |
|---------|------------------------|--------------------------|
| Record | 0 | 1 |
| Scrivibile da | nessuno (UI ERP eliminata commit 639dec3) | Quality `/non-conformities` |
| Conseguenza | Tabella ERP residua, dismettibile |

**Master corretto:** Quality. Già confermato e clean-up UI ERP fatto.

**Azione consigliata:**
1. Export schema ERP `non_conformities` (per audit storico)
2. Drop tabella ERP con migration `2026-XX_drop_quality_legacy_tables.sql`

**Rischio se non risolto:** confusione codice futuro, possibili dev che usano ancora la vecchia tabella.

---

## 3. Duplicazioni MEDIE 🟡

### M1 — `projects` (ERP, 2) vs `project` (Quality, 6)

| Aspetto | ERP `projects` | Quality `project` |
|---------|----------------|-------------------|
| Record | 2 commesse demo ERP | 6 commesse + 1 DEMO-QS-001 |
| Scrivibile da | ERP commesse module | Quality `/projects` |
| Conseguenza | Stesse commesse in due posti, niente sync |

**Master corretto:** ERP. Quality è esecutore qualità sulla commessa.

**Azione consigliata:** aggiungere `project.global_id` + sync ERP→Quality nella migration successiva (`2026-XX_global_id_projects.sql`).

### M2 — `sites` (ERP, 2) vs `site` (Quality, 0)

Stessa logica di M1 ma su cantieri. Quality `site` vuota — non urgente.

### M3 — `documents` (ERP, vuota) vs `document` + `document_revision` + `file_attachment` (Quality, 25+25+25)

**Master corretto:** Quality. ERP `documents` è scaffold mai usato.

**Azione consigliata:** drop tabella ERP `documents` dopo audit storico zero.

### M4 — `materials` (ERP, vuota) vs `material_lot` (Quality, 1) + `asset` (25)

Master split: ERP = catalogo articoli, Quality = lotti con tracciabilità qualità. Da chiarire e linkare via FK.

### M5 — `quality_inbound_log` (ERP, 3 record, RLS OFF) ⚠️

Tabella creata dalla migration `2026-05-25_global_id_counterparties_quality_sync.sql` per dedup webhook receiver. **RLS disabilitato** — advisory critico Supabase: chiunque con anon key può leggere/scrivere.

**Azione consigliata immediata:**
```sql
ALTER TABLE quality_inbound_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON quality_inbound_log FOR ALL TO service_role USING (true);
-- DEFAULT POLICY: ANON e AUTHENTICATED bloccati
```

---

## 4. Duplicazioni LEGACY (clean-up programmato) 🟢

Tabelle ERP rimaste vuote/scollegate dopo cleanup UI commit `639dec3`:

| Tabella ERP | Equivalente Quality (master) | Drop sicuro? |
|-------------|------------------------------|--------------|
| `quality_audits` | `audit` + `audit_checklist` + `audit_finding` | ✅ vuota |
| `quality_certifications` | `standard`, `national_requirement`, `document`, `ce_dossier` | ✅ vuota |
| `quality_procedures` | `document` + `process_instruction` + `procedure_format_link` | ✅ vuota |
| `quality_kpi` | `quality_score`, `quality_score_snapshot` | ✅ vuota |
| `non_conformities` | `non_conformity` | ✅ vuota (vedi D3) |
| `supplier_qualifications` | `supplier_qualification` (Quality) | ✅ vuota |
| `qualification_settings` | hard-coded in Quality `supplier_qualification.config` | ✅ vuota |

**Azione consigliata:** migration `2026-XX_drop_legacy_quality_tables_erp.sql` (con backup snapshot 5min prima).

---

## 5. Duplicazioni DIVERGENTI (stesso nome, semantica diversa — NON fondere) 🟢

| Nome | ERP | Quality | Azione |
|------|-----|---------|--------|
| `role` | (non esiste come tabella; `profiles.role` text) | `role` (18 record) + `role_permission` (45) RBAC granulare ISO | **Tenere separati**: gestionale vs ISO. Rinominare ERP `profiles.role` → `gestional_role` per chiarezza. |
| `audit_log` | `audit_logs`, `expense_audit_log`, `payment_audit_log`, `purchase_request_audit_log`, `timesheet_audit_log` | `audit_log` + `entity_revision` + `applicative_signature` + `quality_event_log` | **Tenere separati**: ogni app traccia i suoi atti. Vista aggregata `v_group_audit_log` opzionale. |
| `notification` | `alerts`, `notification_recipients` | `notification` + `notification_recipient` + `notification_delivery` + `notification_action` + `message_template` + `popup_rule` + `popup_dismissal` | **Tenere separati**: utenti separati. Bridge solo per eventi cross. |
| `quality_inbound_log` | tabella nuova ERP per dedup webhook | — | Naming OK, scope chiaro. |

---

## 6. Catene PARALLELE (da linkare con FK, non fondere) 🟡

### P1 — Acquisti

```
ERP:     purchase_request → purchase_order → purchase_invoice → payment
Quality: material_request → material_order → material_reception → material_nc → material_loss
```

**Realtà operativa**: due flussi diversi che dovrebbero parlarsi. ERP è amministrativo (numero PO, condizioni pagamento, fattura), Quality è esecutivo cantiere (richiesta operatore, autorizzazione produzione/spedizione/ricezione fornitore, foto live, NC qualità).

**Azione consigliata:** aggiungere FK reciproche:
- `material_request.erp_purchase_request_id` (uuid nullable)
- `material_order.erp_purchase_order_id` (uuid nullable)
- `material_reception.erp_delivery_note_id` (uuid nullable)

Niente sync automatico: link esplicito dall'utente o pre-popolato quando ERP crea il PO.

### P2 — Manutenzioni

```
ERP:     vehicle_interventions + vehicle_intervention_parts + maintenance_records
Quality: asset_intervention + _part + _cost + _warranty + _evidence
```

Stesso pattern ma su entità diverse (veicoli vs strumenti). **Tenere separati**, eventualmente unificare in un futuro `asset_unified` solo se vantaggio operativo.

### P3 — Formazione

```
ERP:     training_sessions + training_session_attendees + training_courses + employee_training_records
Quality: competence + person_competence + training_event + training_attendee
```

ERP = HR formale (corsi calendarizzati, attestati legali). Quality = competenze operative ISO (qualifiche saldatore, brevetti). **Link via `person_competence.employee_id`** (FK opzionale verso ERP).

### P4 — Contratti

```
ERP:     (mancante, contratto in PDF dentro counterparties.notes?)
Quality: contract + contract_clause + technical_sheet
```

Solo Quality ha contract. ERP dovrebbe avere contratti commerciali (subappalto, fornitura, lavoro). Da chiarire: aggiungere `contract` su ERP per il lato fiscale o lasciare a Quality?

---

## 7. Smoke test di stato bridge (2026-05-25, post fix 7a9d6f0 + 04bc6c0)

Test E2E con fornitore reale `2 A FORNITURE INDUSTRIALI SRL` (`global_id=82b56243-...`):

| # | Check | Esito |
|---|-------|-------|
| 1 | Debug endpoint Quality (`/api/integrations/erp/debug-supplier/[gid]`) → `score=30, blocked=true` | ✅ |
| 2 | Quality-status endpoint (`/api/integrations/erp/suppliers/[gid]/quality-status`) → `score=30, blocked=true` | ✅ (era 85/false prima del fix cache) |
| 3 | ERP cache `counterparties.quality_*` → `quality_blocked_for_orders=true` con 3 motivi | ✅ |
| 4 | ERP gate ordine → `createPurchaseOrder` rifiuta con messaggio dettagliato + deep link Quality | ✅ |

**Conclusione:** il bridge ERP↔Quality è verificato funzionante. Il gate ordine legge dato fresh dal DB Quality.

---

## 8. Conflitti aperti

| ID | Entity | Field | ERP value | Quality value | Stato |
|----|--------|-------|-----------|---------------|-------|
| 1 | supplier_qualification | score | 99 (test) | 85 (corretto) | UNRESOLVED, visibile in `/integrations/erp-quality` |

Il conflitto è il risultato di Test 3 della test suite (`/integrations/erp-quality/test`) — push intenzionale di score=99 da ERP, Quality ha rifiutato perché è campo PROTECTED. Da risolvere manualmente come esercizio.

---

## 9. Roadmap suggerita (post-audit Fase 1)

### Fase 1.5 — Hardening (sicuro, ~1 settimana)
- [ ] Abilitare RLS su `quality_inbound_log` (M5)
- [ ] Migration `2026-XX_drop_legacy_quality_tables_erp.sql` (sezione 4)
- [ ] Sync `companies/projects/sites` (D1, M1, M2) — endpoint bidirezionali
- [ ] FK opzionali catene parallele (P1, P3)

### Fase 2 — Ecosistema condiviso (medio rischio, ~1 mese)
- [ ] Decisione SSO (sez. 5 ownership matrix) — opzioni Microsoft/Google/Azure AD vs project unico
- [ ] Tabella `group_global_id_mapping` cross-project per audit unificato
- [ ] Vista `v_group_audit_log` aggregata per direzione
- [ ] Bridge eventi notifica cross (es. blocco fornitore → notifica responsabile ordini ERP)
- [ ] Storage Supabase condiviso per allegati (bucket cross-project con signed URL)

### Fase 3 — Piattaforma unica modulare (alto rischio, ~3 mesi, opzionale)
Da valutare solo SE dopo Fase 2 risulta evidente che mantenere due project Supabase costa più del beneficio. Richiede:
- Backup completo + piano rollback testato
- Monorepo (apps/erp + apps/quality + packages/shared)
- Schema migration con downtime previsto
- Auth unico
- Audit log unico
- Re-training utenti

---

## 10. Cosa NON è in questo audit

- ❌ Performance / indici / query slow
- ❌ Security review approfondita (solo l'advisory RLS evidente)
- ❌ Costo Supabase aggregato gruppo
- ❌ Mappatura granulare permessi/RBAC (richiede sessione dedicata)
- ❌ Backup policy / disaster recovery
- ❌ GDPR / data retention

Tutto questo è materiale per **audit Fase 2** se la direzione approva la roadmap.

---

## 11. Firma audit

Generato automaticamente dal tooling Claude Code in seguito a esplicita richiesta utente del 2026-05-25 (post fix bug cache `7a9d6f0`). Non è un audit legale né garanzia di completezza. È una **mappa di partenza** per discussioni di prodotto e architettura.

Per ogni voce sopra, **prima dell'esecuzione di qualsiasi azione**, è richiesto:
1. Backup DB target
2. Approvazione direzione gruppo
3. Branch dedicato
4. Test 4-check post-modifica (sez. 7)
