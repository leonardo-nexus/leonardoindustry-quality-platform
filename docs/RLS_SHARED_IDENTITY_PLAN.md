# RLS Shared Identity Plan

**Versione:** v1.0 (2026-05-25)
**Scope:** come le RLS Quality (e ERP) leggeranno l'identità condivisa (`global_person_id`) **senza rompere** le policy attuali. Strategia di compatibilità retroattiva.

---

## 1. Stato attuale RLS Quality

Le RLS Quality oggi sono basate su:
- `auth.uid()` (id Supabase Auth Quality) — joinato con `person.auth_user_id`
- `person.role_id` → `role.code` (per check ruolo)
- `person.company_id` (per scope company)
- `team_member.person_id` (per scope team)

**Esempio policy tipica:**

```sql
CREATE POLICY "rq_can_read_company_audit"
ON public.audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.person p
    JOIN public.role r ON r.id = p.role_id
    WHERE p.auth_user_id = auth.uid()
      AND r.code IN ('responsabile_qualita','direzione_impresa','direzione_gruppo','admin_gruppo')
      AND (r.code IN ('direzione_gruppo','admin_gruppo') OR p.company_id = audit.company_id)
  )
);
```

**Funziona oggi** perché `auth.uid()` Quality identifica la persona, e `person.auth_user_id` la collega ai ruoli.

---

## 2. Cosa cambia con Identity Bridge

Dopo Fase 3 Identity Bridge:
- `person.global_person_id` (text) → popolato per utenti migrati
- `identity_role_assignment` (su ERP) → fonte autoritativa nuovi ruoli
- Vecchi `person.role_id` Quality → continuano a funzionare per utenti pre-cutover

**Problema**: come fa Quality a leggere `identity_role_assignment` che è su un altro project Supabase?

**Risposta**: non lo legge in tempo reale. **Sync via webhook**:
- Ogni cambio in `identity_role_assignment` su ERP → push verso Quality `/api/integrations/quality/inbound`
- Quality aggiorna `person.role_id` localmente (cache role)
- RLS Quality continua a leggere `person.role_id` (nessun cambio policy!)

Vantaggio: **RLS attuali Quality NON cambiano**. Sostanzialmente Identity Bridge alimenta `person.role_id` dall'esterno, ma la RLS resta identica.

---

## 3. Strategia di compatibilità (3 livelli)

### Livello 1 — RLS attuali invariate (raccomandato per Fase 3)
```
person.role_id ← sync da identity_role_assignment
RLS legge person.role_id come sempre
```

**Pro**: zero impatto policy, zero rischio rottura
**Contro**: c'è un attimo di latenza tra modifica ERP e propagazione Quality (ms-secondi)

### Livello 2 — RLS estese opzionali (futuro)
```sql
-- Aggiunta JOIN opzionale per leggere identity_role_assignment quando sincronizzato
CREATE POLICY "rq_can_read_company_audit_v2"
ON public.audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.person p
    LEFT JOIN public.role r ON r.id = p.role_id
    WHERE p.auth_user_id = auth.uid()
      AND (
        -- Legacy path
        r.code IN ('responsabile_qualita','direzione_impresa','direzione_gruppo','admin_gruppo')
        -- Nuovo path (cache shared, opzionale)
        OR p.shared_role_codes ? 'responsabile_qualita'
      )
  )
);
```

Aggiunta `person.shared_role_codes jsonb` come cache locale del shared. Tutte le RLS continuano a funzionare anche se la cache è vuota.

### Livello 3 — RLS canonical (cutover finale)
Solo dopo Fase E dell'`IDENTITY_CUTOVER_PLAN.md`:
- Tutte le persone hanno `global_person_id`
- `person.role_id` deprecato (ancora presente per backward compat ma read-only)
- RLS leggono direttamente `shared_role_codes` o nuova tabella locale `person_app_role`

**Non eseguire Livello 3 senza:** 6 mesi senza incidenti in Livello 1/2 + approvazione direzione.

---

## 4. Sync ERP → Quality dei ruoli (cuore della Fase 3)

### Endpoint Quality nuovo (da implementare quando si parte con cutover):
`POST /api/integrations/quality/inbound`

Action già supportate:
- `supplier_qualification.updated/expired/deleted`

Action da aggiungere:
- `identity_role_assignment.updated` → payload `{global_person_id, app_code='quality', role_code, scope, company_id, active}`

**Effetto**: Quality cerca `person WHERE global_person_id = X`, aggiorna `role_id` corrispondente, log evento.

### Endpoint ERP nuovo:
`POST /api/integrations/erp/identity/push` (cron daily + on-change)

Legge `identity_role_assignment` modificati, firma HMAC, POST a Quality receiver.

---

## 5. Quando un nuovo utente è invitato

```
1. Admin gruppo crea identity_person su ERP (UI /admin/identity/new)
2. Sceglie ruoli per ERP (es. admin_impresa, company=Enemek)
3. Sceglie ruoli per Quality (es. responsabile_qualita, company=Enemek)
4. ERP server action:
   a. INSERT identity_person
   b. INSERT identity_role_assignment (ERP + Quality)
   c. Crea auth.users ERP (con email invite)
   d. Crea identity_account ERP
   e. POST /api/integrations/quality/inbound con action='person.invite'
5. Quality receiver:
   a. INSERT person (con global_person_id mappato)
   b. INSERT auth.users Quality
   c. INSERT identity_account Quality (back-ref)
   d. Assegna role_id a person basato sul payload
6. Email invite Quality parte all'utente (link magic Quality)
7. Utente clicca, atterra su /auth/sso-callback Quality → sessione attiva
```

Tutto questo è il **futuro**. Oggi solo Christian è migrato e il flow manuale ha funzionato (backfill SQL).

---

## 6. Cosa NON fare nelle RLS

- ❌ NON modificare RLS esistenti per "ottimizzare"
- ❌ NON usare `global_person_id` come PRIMARY identity di RLS senza fallback
- ❌ NON rimuovere `auth.uid()` dai check RLS
- ❌ NON disabilitare RLS temporaneamente per test su prod
- ❌ NON consentire bypass RBAC via JWT manipolazione (test in stage)

---

## 7. Test RLS pre/post cutover

Per ogni RLS modificata:

```sql
-- Test come authenticated user X (operatore)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "uid-operatore"}';
SELECT count(*) FROM target_table;  -- atteso: solo own records

-- Test come authenticated user Y (RQ)
SET LOCAL request.jwt.claims = '{"sub": "uid-rq"}';
SELECT count(*) FROM target_table;  -- atteso: company records

-- Test bypass: nessun ruolo
SET LOCAL request.jwt.claims = '{"sub": "uid-unknown"}';
SELECT count(*) FROM target_table;  -- atteso: 0
```

Eseguire SU OGNI tabella critica (audit, NC, checklist, evidence) prima e dopo ogni fase cutover. Differenze devono essere = 0.

---

## 8. Vista monitoraggio drift

```sql
-- Quante persone Quality hanno global_person_id mappato?
CREATE VIEW v_identity_sync_status AS
SELECT
  count(*) FILTER (WHERE global_person_id IS NOT NULL) as mapped,
  count(*) FILTER (WHERE global_person_id IS NULL) as unmapped,
  count(*) as total,
  round(100.0 * count(*) FILTER (WHERE global_person_id IS NOT NULL) / nullif(count(*),0), 1) as mapped_pct
FROM person
WHERE deleted_at IS NULL;
```

Dashboard `/admin/identity/sync-status` mostra questa vista. Quando `mapped_pct = 100`, si può procedere a Fase E.

---

## 9. Backup pre-modifica RLS

Prima di ogni modifica policy:

```sql
SELECT pg_get_expr(qual, polrelid)
FROM pg_policy
WHERE polname IN (...);
-- Salva output in database/backups/2026-XX_rls_pre_change.sql
```

---

## 10. Riferimenti

- [`IDENTITY_CUTOVER_PLAN.md`](./IDENTITY_CUTOVER_PLAN.md) — fasi macro
- [`QUALITY_ACCESS_DECOMMISSION_PLAN.md`](./QUALITY_ACCESS_DECOMMISSION_PLAN.md) — dettaglio dismissione
- [`IDENTITY_SSO_STRATEGY.md`](./IDENTITY_SSO_STRATEGY.md) — Opzione B rationale
- [`IDENTITY_OPERATOR_AUDIT.md`](./IDENTITY_OPERATOR_AUDIT.md) — utenti reali
