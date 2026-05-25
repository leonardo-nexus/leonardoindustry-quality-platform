# Legacy Tables Usage Report — ERP qualità

**Versione:** v1.0 (2026-05-25)
**Scopo:** verificare DAVVERO se le 7 tabelle qualità ERP marcate "legacy" nel `ERP_QUALITY_DUPLICATION_AUDIT.md` sez. 4 sono dismettibili senza rompere nulla. **Niente drop in questo report**: solo audit.

**Regola:** una tabella si può droppare solo se ha **tutti** i seguenti:
1. ✅ 0 record (oggi)
2. ✅ Nessuna FK in entrata (no altre tabelle che la referenziano)
3. ✅ Nessuna vista che la usa
4. ✅ Nessun codice ERP che la legge/scrive

Se anche solo uno è violato → **NON droppabile** in questa fase. Va prima rifattorizzata.

---

## 1. Riepilogo per tabella

| Tabella | Record | FK in entrata | Viste dipendenti | Codice ERP attivo | **Droppabile?** |
|---------|-------:|---------------|------------------|-------------------|:--:|
| `quality_audits` | 0 | 1 (← non_conformities) | — | — | ❌ NO (FK) |
| `quality_certifications` | 0 | — | `v_quality_certifications_status`, `v_all_deadlines` | — | ❌ NO (viste) |
| `quality_procedures` | 0 | — | — | — | ✅ SÌ |
| `quality_kpi` | 0 | — | `v_quality_kpi_status` | — (solo via vista in `/kpi/page.tsx`) | 🟡 prima drop vista |
| `non_conformities` | 0 | — | `v_non_conformities_status` | `/kpi/page.tsx` (read) + `/backup/page.tsx` (export) + `/backup/BackupClient.tsx` (label) | ❌ NO (codice attivo) |
| `supplier_qualifications` | 0 | — | `v_supplier_qualification_status` (joined con `qualification_settings`) | `/backup/page.tsx` + `/backup/BackupClient.tsx` (label) + `/fornitori/[id]/page.tsx` legge `v_supplier_qualification_status` | ❌ NO (codice attivo) |
| `qualification_settings` | **1** | — | `v_supplier_qualification_status` | `/impostazioni/page.tsx` (read) + `/impostazioni/actions.ts` (upsert) | ❌ NO (record + codice attivo) |

---

## 2. Dettaglio FK in entrata

```
non_conformities.related_audit_id → quality_audits(id)   [FK non_conformities_related_audit_id_fkey]
```

Quindi `quality_audits` non si droppa finché `non_conformities` esiste.

---

## 3. Dettaglio viste dipendenti

| Vista | Dipende da | Usata in codice ERP? |
|-------|-----------|----------------------|
| `v_all_deadlines` | `quality_certifications` | da verificare in scadenze |
| `v_non_conformities_status` | `non_conformities` | `/kpi/page.tsx` non lo usa direttamente (usa la tabella) |
| `v_quality_certifications_status` | `quality_certifications` | da verificare |
| `v_quality_kpi_status` | `quality_kpi` | ✅ `/kpi/page.tsx:22` |
| `v_supplier_qualification_status` | `qualification_settings` + `supplier_qualifications` | ✅ `/fornitori/[id]/page.tsx:16` |

---

## 4. Riferimenti codice ERP attivi

### 4.1 `/impostazioni` — `qualification_settings`

```ts
// app/impostazioni/page.tsx:39
supabase.from("qualification_settings").select("*").eq("id", 1).maybeSingle()

// app/impostazioni/actions.ts:36
const { error } = await supabase.from("qualification_settings").upsert(payload);
```

**Funzione:** la pagina Impostazioni ERP ha ancora il blocco "Qualifica fornitori" con campi:
- Soglia minima score
- Validità mesi
- Blocca ordini ON/OFF

**Stato:** **questi setting NON sono più la fonte verità del gate**: il gate ERP `createPurchaseOrder` ora interroga Quality (`fetchQualityStatus`). Quindi questi campi sono UI residuale che non incide. Tuttavia l'UI esiste ancora e l'utente potrebbe modificarli pensando di cambiare comportamento (non vero).

**Azione consigliata:** rimuovere la sezione "Qualifica fornitori" da `/impostazioni` con un banner "Gestione qualifica delegata a Leonardo Quality Control Plant — apri qui".

### 4.2 `/kpi` — `non_conformities` + `v_quality_kpi_status`

```ts
// app/kpi/page.tsx:21
safe<any[]>(supabase.from("non_conformities").select("status, severity, detected_date")...)
// app/kpi/page.tsx:22
safe<any[]>(supabase.from("v_quality_kpi_status").select("*") as any)
```

**Funzione:** dashboard KPI ERP mostra contatori NC e indicatori qualità leggendo dalle tabelle ERP — che sono **vuote**. Quindi la dashboard mostra "0 NC, 0 KPI" sempre.

**Stato:** **dashboard inaffidabile** — l'utente vede 0 NC mentre Quality ne ha 1. **Bug di percezione.**

**Azione consigliata:** modificare `/kpi/page.tsx` per leggere via Quality endpoint (es. nuovo `/api/integrations/erp/kpi-dashboard`) o mostrare deep-link "Vedi KPI completi in Quality →" + valori zero.

### 4.3 `/backup` — `non_conformities` + `supplier_qualifications`

```ts
// app/backup/page.tsx:13-14
"non_conformities", "documents", "training_sessions",
"supplier_qualifications", "purchase_orders", "purchase_requests"

// app/backup/BackupClient.tsx:11-21
vacation_requests: "Richieste ferie", non_conformities: "Non conformità", documents: "Documenti",
training_sessions: "Sessioni formazione", supplier_qualifications: "Qualifiche fornitori",
```

**Funzione:** elenco tabelle che il backup automatico esporta. Include le 2 legacy.

**Stato:** harmless (esporta 0 record), ma scoraggia drop.

**Azione consigliata:** rimuovere dall'elenco quando si droppano effettivamente le tabelle.

### 4.4 `/fornitori/[id]` — `v_supplier_qualification_status`

```ts
// app/fornitori/[id]/page.tsx:16
supabase.from("v_supplier_qualification_status").select("*").eq("supplier_id", id).maybeSingle()
```

**Funzione:** badge legacy nella scheda fornitore ERP (es. "QUALIFICATO 85/100"). Oggi convive con il widget Quality embed che è la fonte verità.

**Stato:** **doppia visualizzazione confusa** — badge legacy ERP (sempre vuoto) + widget Quality (vero stato).

**Azione consigliata:** rimuovere il blocco badge legacy dalla scheda fornitore ERP, mantenere solo il widget Quality.

---

## 5. Quali tabelle si possono droppare ORA, in sicurezza?

### Droppabile **sicuro**:
- ✅ `quality_procedures` (0 record, 0 FK, 0 viste, 0 codice)

### Droppabile **dopo prerequisito**:
- 🟡 `quality_kpi` — prerequisito: `DROP VIEW v_quality_kpi_status` + sostituire chiamata in `/kpi/page.tsx`
- 🟡 `quality_certifications` — prerequisito: `DROP VIEW v_quality_certifications_status` + `DROP VIEW v_all_deadlines` (o riscriverla solo su Quality)

### **NON droppabile** ora:
- ❌ `quality_audits` (FK)
- ❌ `non_conformities` (codice attivo `/kpi`, `/backup`)
- ❌ `supplier_qualifications` (codice attivo `/fornitori/[id]`, `/backup`)
- ❌ `qualification_settings` (codice attivo `/impostazioni`, **1 record**)

---

## 6. Roadmap drop (proposta, da approvare)

### Step A — Refactor codice ERP (priorità alta, no DB change)
1. `/kpi/page.tsx` → fetch da Quality endpoint anziché tabelle ERP vuote
2. `/fornitori/[id]/page.tsx` → rimuovi badge legacy, lascia solo widget Quality
3. `/impostazioni/page.tsx` → banner "Gestione qualifica delegata a Quality" + bottone Apri Quality, rimuovi form
4. `/backup/page.tsx` + `BackupClient.tsx` → rimuovi le 2 tabelle dall'elenco
5. Test: `/impostazioni`, `/kpi`, `/fornitori/[id]`, `/backup` funzionanti

### Step B — Drop viste obsolete (~1 settimana dopo Step A)
```sql
DROP VIEW IF EXISTS v_quality_kpi_status;
DROP VIEW IF EXISTS v_quality_certifications_status;
DROP VIEW IF EXISTS v_supplier_qualification_status;
DROP VIEW IF EXISTS v_non_conformities_status;
-- v_all_deadlines: prima riscrivere senza quality_certifications, poi drop legacy
```

### Step C — Drop tabelle vuote (dopo Step B)
```sql
DROP TABLE IF EXISTS quality_procedures;
DROP TABLE IF EXISTS quality_kpi;
DROP TABLE IF EXISTS quality_certifications;
DROP TABLE IF EXISTS supplier_qualifications;
-- non_conformities: SPECIAL — vedi NC_MIGRATION_PLAN.md (sopravvive Step C)
-- qualification_settings: SPECIAL — 1 record, valutare se backupparlo prima
-- quality_audits: drop solo dopo aver droppato non_conformities (per FK)
```

### Step D — Verifica audit log (post drop)
- Vista `v_group_audit_log` non deve avere riferimenti a tabelle droppate
- `audit_logs` ERP non deve avere righe orfane

---

## 7. Backup pre-drop (PRIMA di qualsiasi step C)

```sql
-- Export schema completo
COPY (SELECT * FROM quality_audits) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM quality_certifications) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM quality_procedures) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM quality_kpi) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM non_conformities) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM supplier_qualifications) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM qualification_settings) TO STDOUT WITH CSV HEADER;
```

Save in `database/backups/2026-XX_legacy_quality_tables_pre_drop.csv.gz`.

---

## 8. Cosa NON fare

- ❌ **NON eseguire** `DROP TABLE` ora — ci sono dipendenze attive
- ❌ **NON modificare** `qualification_settings` senza prima migrare il setting in Quality (`qualification_settings.min_score_required` deve diventare config Quality)
- ❌ **NON droppare** `non_conformities` finché non è chiaro cosa fare di eventuali NC future migrate (vedi NC_MIGRATION_PLAN.md prossimo doc)

---

## 9. Conclusione operativa

**Solo 1 tabella su 7 è droppabile sicura oggi:** `quality_procedures`.

Le altre 6 richiedono refactor codice ERP (Step A) + drop viste (Step B) come prerequisito.

**Decisione richiesta**: procediamo con Step A in commit separati o teniamo lo status quo per ora?
