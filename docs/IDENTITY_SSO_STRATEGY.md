# Identity SSO Strategy — ERP ↔ Quality

**Versione:** v1.0 (2026-05-25)
**Scope:** confronto tecnico delle 3 opzioni SSO per Leonardo gruppo. **Raccomandazione: Opzione B — Identity Bridge**.

**Regola sopra tutto**: nessuna azione distruttiva. Quality e ERP devono continuare a funzionare durante e dopo l'introduzione.

---

## 1. Opzioni confrontate

### Opzione A — Supabase Auth unico
Migrare ERP e Quality su **un singolo project Supabase Auth** (es. nuovo `leonardo-identity` o estensione di uno dei due esistenti).

```
┌──────────────────────────────────────────┐
│  AUTH SUPABASE UNICA (project X)          │
│  auth.users {id, email, password}         │
└──────────────────────────────────────────┘
              ▲                ▲
              │                │
  ┌───────────┴────┐  ┌────────┴────────┐
  │ ERP (project A)│  │ Quality (proj B) │
  │ profiles       │  │ person           │
  │ (FK auth.id)   │  │ (FK auth_user_id)│
  └────────────────┘  └──────────────────┘
```

**Vantaggi**:
- ✅ login unico reale (Christian si logga 1 volta, vede entrambe le app)
- ✅ `user_id` canonico cross-app
- ✅ RLS più coerente (`auth.uid()` valido ovunque)
- ✅ password reset/MFA centralizzati

**Rischi**:
- 🔴 migrazione tecnica delicata (cross-project Supabase auth federation non è feature standard)
- 🔴 downtime probabile
- 🔴 RLS attuale di ERP e Quality basate su `auth.uid()` da rivedere TUTTE
- 🔴 reset password forzato per tutti
- 🔴 impatta entrambe le app

**Quando ha senso**: greenfield o consolidamento massivo con team dedicato.

---

### Opzione B — Identity Bridge ⭐ RACCOMANDATA

ERP e Quality mantengono **auth separata** (un project Supabase ciascuno), ma sopra introduco un livello canonico che le collega.

```
┌──────────────────────────────────────────────┐
│  IDENTITY LAYER (tabella shared)             │
│  identity_person { global_person_id, email }│
│  identity_account { person, app, auth_id }  │
└──────────────────────────────────────────────┘
              ▲                ▲
              │                │
  ┌───────────┴────┐  ┌────────┴────────┐
  │ ERP            │  │ Quality          │
  │ profiles       │  │ person           │
  │ + global_person│  │ + global_person  │
  │   _id (FK)     │  │   _id (FK)       │
  └────────────────┘  └──────────────────┘
```

**Vantaggi**:
- ✅ **NON rompe Quality** (riga fondamentale del prompt)
- ✅ introduzione graduale (un utente alla volta)
- ✅ audit log aggregabile via `global_person_id`
- ✅ deep-link cross-app con contesto utente (token shared signed)
- ✅ reversibile (basta non popolare le colonne nuove)
- ✅ pattern già usato per `global_id` su `counterparties/companies/projects/sites`
- ✅ Quality auth/RLS attuali intatte

**Rischi**:
- 🟡 2 auth restano sotto (login fisicamente doppio, ma può essere automatizzato)
- 🟡 serve gestione mapping email→identity (la maggior parte risolvibile auto via email)
- 🟡 possibile drift: utente cambia password in ERP, Quality non lo sa

**Quando ha senso**: **adesso**, perché abbiamo già la convivenza ed entrambe le app sono operative.

**Implementazione minima** (non eseguita, da approvare):

1. **Migration ERP** — aggiungi `profiles.global_person_id uuid UNIQUE`
2. **Migration Quality** — aggiungi `person.global_person_id text UNIQUE`
3. **Mapping iniziale**: 1 record (Christian) cross-match per email
4. **Tabella `identity_person`** in uno dei due project (es. ERP, fa da master HR) o in un terzo dedicato
5. **Endpoint sync**: `POST /api/integrations/identity/upsert` su entrambi i lati (HMAC stesso pattern)
6. **UI admin `/admin/identity`** in ERP che mostra mapping + invita persona a Quality
7. **Audit log esteso** con `global_person_id` (aggiunge colonna nullable)

---

### Opzione C — Provider esterno (OIDC: Microsoft / Google / Azure AD)

Ogni utente si logga con account aziendale Microsoft/Google. Supabase auth Federation supporta OIDC.

```
┌────────────────────────────────────┐
│  Microsoft Azure AD (o Google IdP) │
│  Christian@enemek.com              │
└────────────────────────────────────┘
              ▲                ▲
              │                │
   OIDC SSO   │                │ OIDC SSO
              │                │
  ┌───────────┴────┐  ┌────────┴────────┐
  │ ERP            │  │ Quality          │
  │ Supabase Auth  │  │ Supabase Auth    │
  │ + OIDC trust   │  │ + OIDC trust     │
  └────────────────┘  └──────────────────┘
```

**Vantaggi**:
- ✅ standard aziendale enterprise
- ✅ MFA / password rotation gestiti dall'IdP esterno
- ✅ revoca centralizzata (dipendente che lascia: disabilita Azure AD → tutto bloccato)
- ✅ no gestione password localmente
- ✅ compliance ISO/SOC2 facilitata

**Rischi**:
- 🔴 dipendenza esterna (Azure AD down → nessuno entra)
- 🔴 setup tenant + branding + licenze
- 🔴 ruoli applicativi (operatore/RQ/...) restano comunque da gestire dentro ERP e Quality
- 🔴 utenti esterni (fornitori, clienti DL) richiedono guest accounts → complessità

**Quando ha senso**: quando il gruppo cresce >50 utenti, o quando IT impone MFA aziendale.

---

## 2. Confronto sintetico

| Criterio | A: Auth unica | B: Identity Bridge | C: OIDC esterno |
|----------|:-------------:|:------------------:|:---------------:|
| Login unico utente | ✅ | 🟡 sessione condivisa via deep-link | ✅ |
| Rompe Quality? | 🔴 sì | ✅ NO | 🟡 medio (richiede config) |
| Impatta RLS esistente | 🔴 sì molto | ✅ no | 🟡 medio |
| Costo implementazione | 🔴 alto | 🟢 basso | 🟡 medio |
| Reversibilità | 🔴 difficile | ✅ facile | 🟡 media |
| Audit log cross-app | ✅ | ✅ via `global_person_id` | ✅ via `oidc_sub` |
| Fornitori/clienti esterni | ✅ | ✅ | 🔴 richiede guest |
| Enterprise compliance | 🟡 | 🟡 | ✅ |
| Tempi (settimane) | 🔴 4-8 | 🟢 1-2 | 🟡 2-4 |

---

## 3. Raccomandazione: Opzione B (Identity Bridge)

**Perché**:
1. ✅ Rispetta la regola "non rompere Quality"
2. ✅ Pattern già consolidato (uso `global_id` su counterparties)
3. ✅ Reversibile (basta non popolare colonne nuove)
4. ✅ Time-to-value minimo (1-2 settimane)
5. ✅ Prepara terreno per Opzione C in futuro (quando IT/compliance aziendale lo richiederà)
6. ✅ Audit log unificabile subito

**Limiti accettati**:
- 🟡 Login fisicamente doppio (mitigabile con auto-login via JWT shared)
- 🟡 Drift password possibile (mitigabile con check periodico)
- 🟡 Non è "vero" SSO enterprise

**Roadmap evolutiva** (futuro):
- Fase 3a — Identity Bridge (oggi raccomandato)
- Fase 3b — quando >20 utenti attivi: valutare Opzione C OIDC
- Fase 3c — quando il gruppo richiede consolidamento profondo: Opzione A

---

## 4. Implementazione Opzione B — Plan tecnico (NON eseguito)

### Step 1 — Schema (non distruttivo)

```sql
-- ERP project
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS global_person_id uuid UNIQUE;
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS global_person_id uuid UNIQUE;

-- Quality project
ALTER TABLE public.person
  ADD COLUMN IF NOT EXISTS global_person_id uuid UNIQUE;

-- Master canonico (su ERP, perché HR è master)
CREATE TABLE IF NOT EXISTS public.identity_person (
  global_person_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_primary text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  phone text,
  preferred_locale text DEFAULT 'it' CHECK (preferred_locale IN ('it','es')),
  primary_company_id uuid REFERENCES public.companies(id),
  person_type text DEFAULT 'interno' CHECK (person_type IN ('interno','fornitore','cliente','auditor')),
  status text DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Account collegati (uno per app)
CREATE TABLE IF NOT EXISTS public.identity_account (
  global_account_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_person_id uuid NOT NULL REFERENCES identity_person(global_person_id),
  auth_provider text NOT NULL CHECK (auth_provider IN ('supabase_erp','supabase_quality','microsoft','google')),
  auth_user_id text NOT NULL,
  app_source text NOT NULL CHECK (app_source IN ('erp','quality')),
  email text NOT NULL,
  last_login_at timestamptz,
  UNIQUE (auth_provider, auth_user_id)
);

-- Ruoli per app/company
CREATE TABLE IF NOT EXISTS public.identity_role_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_person_id uuid NOT NULL REFERENCES identity_person(global_person_id),
  app_code text NOT NULL CHECK (app_code IN ('erp','quality','group','shared')),
  company_id uuid REFERENCES public.companies(id),
  role_code text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('own','team','company','group','all')),
  active boolean DEFAULT true,
  assigned_by uuid REFERENCES identity_person(global_person_id),
  assigned_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (global_person_id, app_code, company_id, role_code)
);
```

### Step 2 — Backfill iniziale (1 record Christian)

```sql
-- ERP: crea identity_person per Christian
INSERT INTO identity_person (email_primary, first_name, last_name, primary_company_id, person_type, status)
VALUES ('c.capuano@proenesys.com', 'Christian', 'Capuano',
        (SELECT id FROM companies WHERE name = 'Pro Enesys' LIMIT 1),
        'interno', 'active')
RETURNING global_person_id;
-- es. risultato: 'abc12345-...'

-- ERP: link profile
UPDATE profiles SET global_person_id = 'abc12345-...' WHERE email = 'c.capuano@proenesys.com';

-- ERP: link employee (se lo stesso Christian è dipendente)
UPDATE employees SET global_person_id = 'abc12345-...' WHERE first_name='Christian' AND last_name='Capuano';

-- ERP: registra account ERP
INSERT INTO identity_account (linked_person_id, auth_provider, auth_user_id, app_source, email)
VALUES ('abc12345-...', 'supabase_erp', 'f084b467-20e7-4c59-bad7-db8b8a58c6b8', 'erp', 'c.capuano@proenesys.com');

-- ERP: registra account Quality (mapping)
INSERT INTO identity_account (linked_person_id, auth_provider, auth_user_id, app_source, email)
VALUES ('abc12345-...', 'supabase_quality', '7c0d948f-124f-4300-ad9d-d370b8a3db73', 'quality', 'c.capuano@proenesys.com');

-- Quality: backfill global_person_id
UPDATE person SET global_person_id = 'abc12345-...' WHERE email = 'c.capuano@proenesys.com';

-- ERP: ruoli
INSERT INTO identity_role_assignment (global_person_id, app_code, role_code, scope, assigned_by)
VALUES ('abc12345-...', 'erp', 'super_admin_gruppo', 'all', 'abc12345-...'),
       ('abc12345-...', 'quality', 'super_admin_gruppo', 'all', 'abc12345-...');
```

### Step 3 — UI admin `/admin/identity`

Pagina ERP che mostra:
- Lista `identity_person` aggregata
- Per ogni persona: account collegati (badge ERP + badge Quality + IdP futuri)
- Ruoli per app
- Ultimo login per app
- Conflitti (es. email Quality.person diversa da ERP.profiles)
- Azioni: invita a app X, sospendi, modifica ruolo

### Step 4 — Sync endpoint (entrambi i lati)

`POST /api/integrations/identity/upsert` (firma HMAC come pattern già esistente):
- Body: `{global_person_id, email, first_name, last_name, app_role, company_id, status}`
- ERP riceve → upsert su `identity_person` + `identity_role_assignment`
- Quality riceve → upsert su `person` (link via `global_person_id`)

### Step 5 — Audit log esteso

Aggiungere colonna `global_person_id uuid` nullable a tutte le audit_log tables (ERP + Quality). Backfill via `auth_user_id` → lookup `identity_account` → `linked_person_id`.

### Step 6 — Deep-link cross-app con contesto

Quando ERP linka a Quality (es. widget supplier), aggiungere parametro `?gp=<global_person_id>` firmato HMAC. Quality riconosce l'utente e mostra UI personalizzata anche se non è loggato in Quality.

---

## 5. Test minimi richiesti dopo implementazione

1. ✅ Christian apre ERP → vede tutto, ha `global_person_id`
2. ✅ Christian apre Quality → vede tutto, stesso `global_person_id`
3. ✅ Audit log Christian: query unificata `SELECT * FROM erp.audit_log UNION SELECT * FROM quality.audit_log WHERE global_person_id = '...'` ritorna 100% azioni
4. ✅ Invito nuovo utente (Costela a Quality) → un solo flow, attiva entrambe le app
5. ✅ Operatore senza accesso Quality non viene mostrato in UI Quality
6. ✅ Utente disattivato (status='suspended') non entra in nessuna app
7. ✅ Cambio ruolo (es. da operatore a capo_cantiere) propaga in entrambe le app
8. ✅ Quality continua a funzionare durante tutto il processo
9. ✅ ERP continua a funzionare durante tutto il processo
10. ✅ Nessun utente esistente è stato cancellato

---

## 6. Guardrail (gli stessi del prompt utente)

- ❌ NON cancellare utenti
- ❌ NON rompere Quality
- ❌ NON fondere auth in modo distruttivo
- ❌ NON cambiare RLS globale senza test
- ❌ NON perdere firme/storico
- ❌ NON sovrascrivere `user_id` storici di Christian (ERP `f084b467` + Quality `7c0d948f` restano intatti)

---

## 7. Roadmap proposta

| Fase | Cosa | Tempo stimato | Rischio | Approvazione |
|------|------|:-:|:-:|:--:|
| 3.0 | Audit + Matrice (questo doc) | 2h | 🟢 | ✅ già fatto |
| 3.1 | Schema `identity_*` su ERP (no FK su altre tabelle, opzionale) | 1h | 🟢 basso | da approvare |
| 3.2 | Backfill Christian (1 record) | 30min | 🟢 basso | da approvare |
| 3.3 | UI `/admin/identity` solo lettura | 1 giorno | 🟢 basso | da approvare |
| 3.4 | Endpoint sync ERP↔Quality identity | 1 giorno | 🟡 medio | da approvare |
| 3.5 | Invito Costela in Quality (test reale) | 1h | 🟡 medio | da approvare |
| 3.6 | Audit log esteso `global_person_id` | 2 giorni | 🟡 medio | da approvare |
| 3.7 | Deep-link cross-app con contesto | 1 giorno | 🟡 medio | da approvare |

**Niente eseguito in questo doc.** Tutto in attesa di tua approvazione esplicita per i prossimi step.

---

## 8. Riferimenti

- [`IDENTITY_OPERATOR_AUDIT.md`](./IDENTITY_OPERATOR_AUDIT.md) — utenti reali oggi
- [`IDENTITY_ROLE_PERMISSION_MATRIX.md`](./IDENTITY_ROLE_PERMISSION_MATRIX.md) — 17 ruoli × capacità
- [`DATA_OWNERSHIP_MATRIX.md`](./DATA_OWNERSHIP_MATRIX.md) sez. 5 — utenti separati per dominio
- [`ERP_QUALITY_DECOMMISSION_PLAN.md`](./ERP_QUALITY_DECOMMISSION_PLAN.md) — roadmap complessiva matrimonio
