# ERP ↔ Quality — Decommission Plan

**Versione:** v1.0 (2026-05-25)
**Scope:** roadmap per dismettere progressivamente i resti tecnici qualità lato ERP, dopo che Fase 2 ha già congelato le scritture. **Niente DROP TABLE** in questa fase: piano + criteri.

---

## 1. Stato attuale (post Fase 2)

| Asset | Stato | Codice attivo? | Scrivibile? | Droppabile ora? |
|-------|-------|:---:|:---:|:---:|
| **Pagine UI ERP qualità** | Rimosse (commit `639dec3`) | ❌ | — | ✅ già fatte |
| **4 viste obsolete** | Droppate (commit `3635f2d`) | ❌ | — | ✅ già fatte |
| `quality_audits` (tab) | Frozen RLS read-only | ❌ | ❌ | ⏳ Step C |
| `quality_certifications` (tab) | Frozen RLS read-only | ❌ | ❌ | ⏳ Step C |
| `quality_procedures` (tab) | Frozen RLS read-only | ❌ | ❌ | ✅ vuota, no FK, no viste — **droppabile sicura** |
| `quality_kpi` (tab) | Frozen RLS read-only | ❌ | ❌ | ⏳ Step C |
| `non_conformities` (tab) | Frozen RLS read-only | ❌ | ❌ | ⏳ dopo decisione NC |
| `supplier_qualifications` (tab) | Frozen RLS read-only | ❌ | ❌ | ⏳ Step C |
| `qualification_settings` (tab) | Attiva, 1 record | ❌ | ✅ (form rimosso, ma RLS ALL ancora aperta) | ⏳ Step C |
| `v_all_deadlines` (vista) | Dipende ancora da `quality_certifications` | ❓ verificare | — | ⏳ refactor separato |

---

## 2. Roadmap dismissione

### Stage 1 — Hardening completato ✅
- [x] H1 RLS su `quality_inbound_log` (advisory critico)
- [x] H2 global_id su companies/projects/sites + mapping
- [x] H3 report uso tabelle legacy
- [x] H4 piano NC

### Stage 2 — Refactor codice ERP completato ✅
- [x] A1 `/kpi` no read legacy
- [x] A2 `/fornitori/[id]` cache `quality_*` invece di vista
- [x] A3 `/impostazioni` banner Quality
- [x] A4 `/backup` rimossi 2 tabelle dall'elenco
- [x] Step B drop 4 viste obsolete

### Stage 3 — Fase 2 matrimonio completato ✅
- [x] F2-1 qualifica fornitori: 0 scritture residue
- [x] F2-2 documenti: banner separazione scope
- [x] F2-3 scadenze: source `quality_certification` → Quality
- [x] F2-4 audit qualità: UI ERP rimossa
- [x] F2-5 NC + altre 5 tabelle: RLS read-only freeze

### Stage 4 — Pulizia DB (TODO, attesa approvazione direzione)

#### Stage 4.1 — Drop tabella sicura
```sql
DROP TABLE IF EXISTS public.quality_procedures;
```
Criterio: 0 record, 0 FK in entrata, 0 viste dipendenti, 0 codice. ✅ tutto soddisfatto.

#### Stage 4.2 — Refactor `v_all_deadlines` (prerequisito per drop `quality_certifications`)
```sql
-- Verifica se v_all_deadlines è ancora usata in codice ERP
-- Se sì, riscrivere senza JOIN su quality_certifications
-- (le scadenze certificazioni sono ora in Quality)
DROP VIEW IF EXISTS v_all_deadlines; -- solo se non usata
CREATE VIEW v_all_deadlines AS ...; -- solo con sources ERP-only (vehicle_compliance_items, ecc.)
```

#### Stage 4.3 — Drop tabelle vuote (post-refactor viste)
```sql
DROP TABLE IF EXISTS public.quality_kpi;
DROP TABLE IF EXISTS public.quality_certifications;
DROP TABLE IF EXISTS public.supplier_qualifications;
DROP TABLE IF EXISTS public.qualification_settings;  -- previo backup del singolo record
DROP TABLE IF EXISTS public.quality_audits;  -- attenzione FK non_conformities.related_audit_id
```

#### Stage 4.4 — Decisione NC (separata)
Vedi `NC_MIGRATION_PLAN.md` per i 3 scenari (Opzione 3 selettiva raccomandata).

---

## 3. Backup obbligatorio pre-drop

Per ogni tabella prima del drop:
```sql
COPY (SELECT * FROM <tabella>) TO '/backups/2026-XX_<tabella>_pre_drop.csv' WITH CSV HEADER;
```

Conservare in `database/backups/` per minimo 6 mesi.

---

## 4. Criteri di accettazione per ogni drop

Una tabella è droppabile se **tutti** i seguenti sono veri:
1. ✅ 0 record (verificato 5 min prima del drop)
2. ✅ 0 FK in entrata da altre tabelle
3. ✅ 0 viste o materialized view dipendenti
4. ✅ 0 funzioni / trigger / policy dipendenti
5. ✅ 0 chiamate dal codice ERP (`grep -rn` recente)
6. ✅ Backup CSV salvato
7. ✅ Approvazione esplicita direzione gruppo

---

## 5. Cronoprogramma suggerito (post decisione)

| T+ | Stage | Cosa | Reversibile |
|----|-------|------|:--:|
| +0 giorni | 4.1 | Drop `quality_procedures` (la più sicura) | sì con backup |
| +1 settimana | 4.2 | Refactor `v_all_deadlines` | sì |
| +2 settimane | 4.3 (parte 1) | Drop `quality_kpi`, `quality_certifications` | sì con backup |
| +3 settimane | 4.3 (parte 2) | Drop `supplier_qualifications`, `qualification_settings` | sì con backup |
| +4 settimane | 4.4 prep | Decisione NC (Opzione 1/2/3) | — |
| +1 mese | 4.4 exec | Esecuzione opzione NC scelta | dipende |
| +2 mesi | 4.3 fine | Drop `quality_audits` (post-NC se Opzione 2/3) | sì con backup |

---

## 6. Cosa monitorare durante Stage 4

- Dashboard ERP: nessun errore "table does not exist"
- Backup automatico Supabase: schema cambiato
- Vercel build: typecheck pulito
- Bridge sync: nessun outbox failed
- Quality Control Plant: nessun impatto (è isolato sul suo project)

---

## 7. Documenti correlati

- [`DATA_OWNERSHIP_MATRIX.md`](./DATA_OWNERSHIP_MATRIX.md)
- [`ERP_QUALITY_DUPLICATION_AUDIT.md`](./ERP_QUALITY_DUPLICATION_AUDIT.md)
- [`LEGACY_TABLES_USAGE_REPORT.md`](./LEGACY_TABLES_USAGE_REPORT.md)
- [`NC_MIGRATION_PLAN.md`](./NC_MIGRATION_PLAN.md)
- [`ERP_QUALITY_FUNCTION_UNIFICATION_REPORT.md`](./ERP_QUALITY_FUNCTION_UNIFICATION_REPORT.md)
- [`ERP_LEGACY_WRITE_BLOCK_REPORT.md`](./ERP_LEGACY_WRITE_BLOCK_REPORT.md)
