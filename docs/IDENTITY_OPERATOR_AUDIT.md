# Identity Operator Audit — ERP ↔ Quality

**Versione:** v1.0 (2026-05-25)
**Scope:** Fase 3.1 matrimonio. Audit non distruttivo dell'identità operatori tra Leonardo ERP Control Center e Leonardo Quality Control Plant. Niente modifiche utenti, niente reset, niente cancellazioni.

---

## 1. Quadro generale

| App | Project Supabase | Tabella anagrafica | Tabella auth | Record |
|-----|------------------|--------------------|--------------|:------:|
| **ERP** | `ndthklmimxfpiqlfxeyc` | `profiles` (3 record) + `employees` (19 record HR) | `auth.users` ERP (collegata a `profiles.id`) | 3 + 19 |
| **Quality** | `rdwaymddygcsfbwbqwtv` | `person` (1 record) | `auth.users` Quality (collegata a `person.auth_user_id`) | 1 |

**Realtà:** oggi solo **Christian** ha effettivamente accesso a entrambe le piattaforme con due account distinti. Tutti gli altri esistono solo in ERP.

---

## 2. Mapping cross-app (per email)

| Email | Nome | ERP `profiles.id` | ERP role | Quality `person.id` | Quality role | Auth ERP | Auth Quality | Match | Azione consigliata |
|-------|------|-------------------|----------|---------------------|--------------|:--:|:--:|:--:|--------------------|
| `c.capuano@proenesys.com` | Christian Capuano | `f084b467-...` | super_admin | `f4c1c627-...` | admin_gruppo | ✅ `f084b467` | ✅ `7c0d948f` | ✅ stessa persona, 2 account | Mapping `global_person_id`, SSO bridge |
| `c.florea@enemek.com` | Costela Florea | `7b05bfa6-...` | admin | — | — | ✅ | — | solo ERP | Decidere se serve accesso Quality (RQ?), eventualmente invitare |
| `g.florea@enemek.ccom` ⚠️ | Giulia Florea | `105c8ee9-...` | pending | — | — | ✅ | — | solo ERP | **Typo email** (`.ccom`), valutare correzione, role pending non confermato |

---

## 3. Anagrafica HR ERP (tabella `employees`)

19 dipendenti registrati. **17 senza email** → non possono diventare utenti Supabase Auth (almeno non con login email/password).

| Tipo | Conteggio | Note |
|------|:---------:|------|
| Con email valida | 2 | Elisabeth Moya Repoles, Ciprian Dan Fuica — candidati per invito Quality |
| Senza email | 17 | Operai, capisquadra, manodopera — accesso fisico cantiere, non digitale |
| Duplicati di identità (in `profiles`) | 1 | Christian Capuano è in `employees` come "Operaio specializzato" (`33ab0001-...`) E in `profiles` come super_admin (`f084b467-...`) → **DUE persone fisiche distinte?** O **stessa persona, 2 ruoli HR vs gestionale?** Da chiarire |
| Duplicati interni `employees` | 1 | Antonello Campus è 2 volte (`67b31a9d` + `6ec41cb1`) → bug data entry |

---

## 4. Issue trovati (da risolvere PRIMA del bridge SSO)

| # | Issue | Severità | Azione |
|---|-------|:--------:|--------|
| I1 | `g.florea@enemek.ccom` — typo dominio (`.ccom` invece di `.com`) | 🔴 alta | Correggere email + ri-invitare verifica |
| I2 | Christian Capuano duplicato: `profiles` super_admin + `employees` operaio specializzato | 🟡 media | Decidere: stessa persona (link via `employee_id`) o omonimia? Probabilmente omonimo o test legacy data — verificare |
| I3 | Antonello Campus 2x in `employees` | 🟡 media | Merge dei 2 record + delete duplicato |
| I4 | 17 dipendenti senza email | 🟢 informativa | Non bloccante per SSO — questi non avranno mai login digitale |
| I5 | Costela Florea esiste in `profiles` (admin) E in `employees` (senza email) | 🟢 informativa | Mappare via nome — aggiungere FK opzionale `profiles.employee_id` |
| I6 | Giulia Florea `role=pending` da chissà quando | 🟡 media | Decidere se attivare/disattivare l'account |
| I7 | Quality ha 1 sola persona → SSO bridge è "facile" oggi ma diventerà critico quando inviteremo gli altri | 🟢 informativa | Pianificare onboarding incrementale |

---

## 5. Modello canonico proposto (NON ancora implementato)

```
identity_person                  master cross-app
  global_person_id (uuid PK)
  email_primary (text unique)    canonical
  first_name, last_name
  phone
  preferred_locale (it/es)
  primary_company_id             FK a una company del gruppo
  type                           interno/fornitore/cliente/auditor
  status                         active/inactive/suspended
  created_at, updated_at
  audit_metadata (jsonb)

identity_account                 link a credential auth specifico
  global_account_id (uuid PK)
  linked_person_id               FK identity_person.global_person_id
  auth_provider                  supabase_erp | supabase_quality | microsoft | google
  auth_user_id                   id stringa nel provider
  app_source                     erp | quality | future_*
  email
  last_login_at

identity_role_assignment         ruolo specifico per app/company/scope
  global_person_id               FK
  app_code                       erp | quality | group | shared
  company_id (nullable)          FK
  role_code                      super_admin_gruppo | direzione_gruppo | ...
  scope                          own | team | company | group | all
  active boolean
  assigned_by                    FK identity_person
  assigned_at, expires_at (nullable)
```

**Modello convivenza:**
- Le tabelle ERP `profiles` + `employees` restano (master HR/auth legacy)
- La tabella Quality `person` resta (master operatori Quality)
- `identity_person` sta sopra come riferimento canonico — può essere su un terzo project Supabase oppure su ERP (master gruppo)

**Modello "Identity Bridge"** (Opzione B raccomandata in `IDENTITY_SSO_STRATEGY.md`):
- Aggiungo `global_person_id uuid` a `profiles` (ERP) e `person` (Quality) come FK shared
- Le 2 auth users restano separate, ma puntano allo stesso `global_person_id`
- Audit log e firme applicative referenziano `global_person_id` per tracciabilità unica

---

## 6. Mapping iniziale concreto (proposto, NON eseguito)

```sql
-- Solo Christian è il caso "match certo". Genero un UUID condiviso.
-- ESEMPIO SOLO — NON ESEGUIRE FINO A DECISIONE DIREZIONE

-- 1) Crea uuid canonico
SELECT gen_random_uuid();  -- es. abc12345-...

-- 2) ERP: aggiungi colonna + popola
-- ALTER TABLE profiles ADD COLUMN global_person_id uuid;
-- UPDATE profiles SET global_person_id = 'abc12345-...' WHERE email = 'c.capuano@proenesys.com';

-- 3) Quality: stessa cosa
-- ALTER TABLE person ADD COLUMN global_person_id uuid;
-- UPDATE person SET global_person_id = 'abc12345-...' WHERE email = 'c.capuano@proenesys.com';
```

**Risultato:** la persona "Christian Capuano" ha lo stesso `global_person_id` in entrambe le DB. Audit log e firme applicative possono ora aggregare la sua attività cross-app.

---

## 7. Operatori candidati per Quality (da decidere)

Quality oggi ha 1 utente. Per attivare flussi operativi (checklist saldatori, RQ, magazzino, capi cantiere) serve invitare altri:

| Email/identifier | Suggerimento ruolo Quality | Motivo |
|------------------|----------------------------|--------|
| Costela Florea | `responsabile_qualita` o `responsabile_commessa` | Già admin ERP, candidata a usare Quality |
| Giulia Florea | da chiarire pending status | Se attiva: ruolo Quality di scope ristretto |
| Elisabeth Moya Repoles | `operatore` o `responsabile_commessa` (Spagna) | Email valida, dipendente registrato |
| Ciprian Dan Fuica | `operatore` cantiere | Email valida |
| 17 operai cantiere senza email | `operatore` con flag `mobile_only` | Useranno solo `/my-work` mobile, login via SMS/QR? |

**Decisione mancante:** strategia onboarding incrementale Quality (chi quando, con quale ruolo, e come gestire i 17 senza email).

---

## 8. Vincoli di sicurezza durante Fase 3

- ❌ NON cancellare utenti
- ❌ NON resettare password
- ❌ NON fondere auth.users tra ERP e Quality
- ❌ NON modificare RLS esistente
- ❌ NON sovrascrivere `auth_user_id` storici di Christian (uno per ERP, uno per Quality)
- ❌ NON cambiare il funzionamento di Quality
- ✅ Solo aggiungere colonne `global_person_id` (nullable) come "ponte" — pattern non distruttivo
- ✅ Solo creare nuove tabelle `identity_*` se serve registry canonico cross-app

---

## 9. Riferimenti

- [`IDENTITY_ROLE_PERMISSION_MATRIX.md`](./IDENTITY_ROLE_PERMISSION_MATRIX.md) — 17 ruoli × app × scope
- [`IDENTITY_SSO_STRATEGY.md`](./IDENTITY_SSO_STRATEGY.md) — opzioni A/B/C + raccomandazione Identity Bridge
- [`DATA_OWNERSHIP_MATRIX.md`](./DATA_OWNERSHIP_MATRIX.md) sez. 2.1 — utenti separati per dominio
- [`ERP_QUALITY_DUPLICATION_AUDIT.md`](./ERP_QUALITY_DUPLICATION_AUDIT.md) sez. 5 — divergenza intenzionale utenti/ruoli
