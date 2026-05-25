# ERP Legacy Write Block Report (Fase 2)

**Versione:** v1.0 (2026-05-25)
**Scope:** documentare cosa è stato congelato lato ERP per impedire scritture su tabelle qualità ora delegate a Quality Control Plant.

**Migration applicata:** `database/migrations/2026-05-25_freeze_legacy_quality_tables_readonly.sql`

---

## 1. Tabelle congelate (RLS read-only authenticated)

| Tabella | RLS attiva | Policy attuali | Record attuali | Scritture ERP possibili? |
|---------|:----------:|----------------|:--------------:|:------------------------:|
| `quality_audits` | ✅ | SELECT authenticated + SELECT anon | 0 | ❌ NO |
| `quality_certifications` | ✅ | SELECT authenticated + SELECT anon | 0 | ❌ NO |
| `quality_procedures` | ✅ | SELECT authenticated + SELECT anon | 0 | ❌ NO |
| `quality_kpi` | ✅ | SELECT authenticated + SELECT anon | 0 | ❌ NO |
| `non_conformities` | ✅ | SELECT authenticated + SELECT anon | 0 | ❌ NO |
| `supplier_qualifications` | ✅ | SELECT authenticated + SELECT anon | 0 | ❌ NO |

**Service role**: bypassa sempre RLS — usato per bridge sync ERP↔Quality + emergenza admin DBA. Codice ERP non lo usa più su queste tabelle.

**Non incluse nel freeze**:
- `qualification_settings` (1 record di config, mantenuta scrivibile per eventuale rollback) — comunque la UI form è stata sostituita con banner deep-link (commit `3f0bfd7` Step A3)

---

## 2. Codice ERP — verifica scritture residue (post-freeze)

### 2.1 Grep scritture su tabelle congelate

```
$ grep -rn "supabase.from\(\"\(quality_audits|quality_certifications|...\)\"\)" frontend/
# RESULT: 0 matches
```

### 2.2 Grep generico (anche letture)

```
$ grep -rn "quality_audits|quality_certifications|quality_procedures|quality_kpi|non_conformities|supplier_qualifications|qualification_settings" frontend/
```

Match trovati (tutti commenti documentali, nessuna chiamata attiva):

| File | Linea | Tipo |
|------|------:|------|
| `app/backup/page.tsx` | 8 | commento "NOTE: rimosse..." |
| `app/backup/BackupClient.tsx` | 6 | commento "NOTE: rimossi..." |
| `app/kpi/page.tsx` | 14 | commento "NOTE: rimosse le query..." |
| `app/impostazioni/page.tsx` | 37 | commento "NOTE: rimossa query..." |
| `app/manuale/page.tsx` | 414 | testo descrittivo manuale utente |
| `app/fornitori/[id]/page.tsx` | 13 | commento "NOTE: rimossa query..." |

**Conclusione:** nessuna chiamata operativa, solo audit-trail testuale.

---

## 3. Verifica policy post-freeze

```sql
SELECT tablename, cmd, roles, policyname FROM pg_policies
WHERE schemaname='public' AND tablename IN (
  'quality_audits','quality_certifications','quality_procedures',
  'quality_kpi','non_conformities','supplier_qualifications'
) ORDER BY tablename, cmd;
```

**Risultato live (2026-05-25):**
- 12 policy totali (2 per tabella)
- Tutte `cmd = SELECT`
- Nessuna `ALL`/`INSERT`/`UPDATE`/`DELETE`

✅ Lock effettivo.

---

## 4. Test sicurezza (atteso)

| Test | Atteso | Note |
|------|--------|------|
| `INSERT` da authenticated su `non_conformities` | ❌ rifiutato | Nessuna policy INSERT presente |
| `UPDATE` da authenticated su `quality_audits` | ❌ rifiutato | Nessuna policy UPDATE presente |
| `DELETE` da authenticated su `supplier_qualifications` | ❌ rifiutato | Nessuna policy DELETE presente |
| `SELECT` da authenticated su qualunque delle 6 | ✅ permesso | Policy `legacy_readonly_select` |
| Bridge sync via service_role | ✅ permesso | service_role bypassa RLS |
| Anon `SELECT` (dashboard pubblica) | ✅ permesso | Policy `*_anon_select` preservata |

**Da fare** (futuro test runtime):
- Tentare un INSERT da Supabase client (authenticated) → verificare `403 / new row violates row-level security`

---

## 5. Rollback (se serve emergenza)

Per ripristinare la scrittura su una tabella specifica:

```sql
-- Esempio: ripristina scrittura su non_conformities
CREATE POLICY "nc_all_authenticated"
  ON public.non_conformities
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

Tuttavia: **prima di farlo, considerare se è davvero necessario.** Quality è il master autorevole; uno scrittura emergency su ERP creerà conflitti silenziosi col bridge sync.

---

## 6. Pattern applicato (riusabile)

Stesso pattern adottabile in futuro per altre dismissioni:

```
1. UI ERP rimossa o trasformata in banner deep-link
2. Codice (server actions, query) rimosso
3. RLS attiva + policy SELECT-only per authenticated
4. service_role mantenuto per bridge / emergency
5. Tabella resta in DB (audit storico)
6. DROP TABLE solo dopo periodo osservazione (Step C futuro)
```

---

## 7. Limiti / rischi residui

| Rischio | Mitigazione |
|---------|-------------|
| Dev futuro reintroduce policy permissive senza saperlo | COMMENT su tabella + presente report |
| Service role usato impropriamente da nuovi endpoint | Code review + audit di `createServiceRoleClient()` |
| RLS disabilitato manualmente da DBA | Monitoring (advisor Supabase rileverebbe) |
| Anon SELECT espone storico (privacy?) | Da valutare se restringere anche anon — non necessario per audit storico |
