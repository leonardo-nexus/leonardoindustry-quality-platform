# Quality Access Decommission Plan

**Versione:** v1.0 (2026-05-25)
**Scope:** dettaglio operativo per dismettere progressivamente il sistema di accesso autonomo di Leonardo Quality Control Plant, trasformandolo in "consumer dell'Identity Layer condiviso ERP".

**Regola sopra tutto**: Quality deve continuare a funzionare in ogni momento. Niente downtime. Niente perdita di firme/audit/storico.

---

## 1. Cosa Quality ha oggi (auth autonoma)

| Componente | Stato | Dipendenza |
|------------|-------|------------|
| `auth.users` Quality | 1 utente (Christian) | Login email/password Supabase Auth diretto |
| `person.auth_user_id` | 1 record mappato | FK soft a `auth.users.id` |
| `person.role_id` → `role` (18 ruoli) | Schema RBAC ISO completo | RLS Quality basate su `role_code` |
| `role_permission` (45 record) | Matrice resource × action × scope | `hasPermission()` la consulta |
| Login UI `/login` | Form email/password | `createSSRClient` + cookies |
| Signup UI `/users/new` | Form invito + assegnazione ruolo | Server action `inviteUser()` |
| `applicative_signature` | Firma immutabile per ogni azione critica | Riferisce `auth_user_id` Quality |
| `audit_log` (15+ righe) | Tracciamento CRUD | Riferisce `created_by/updated_by` (= `person.id`) |
| `quality_event_log` (11 righe) | Eventi qualità | Riferisce persona |
| RLS su 105 tabelle | Filtro per `auth.uid()` o ruolo | Basate su sessione Supabase Auth Quality |

**Conclusione**: Quality è autosufficiente e funzionante. Dismettere bene = preservare TUTTO questo.

---

## 2. Cosa serve nel cutover

| Asset Quality | Trattamento dopo cutover |
|---------------|--------------------------|
| `auth.users` Quality | **Preservato**, ma nessun nuovo utente direttamente. Login forza SSO. |
| `person.auth_user_id` storici | **Preservato per sempre** (firme + audit dependono) |
| `person.role_id` Quality | **Preservato**, ma sync da `identity_role_assignment` ERP (app_code='quality') |
| `role` table Quality | **Preservata** (vocabolario ISO necessario) |
| `role_permission` | **Preservata** (matrice RBAC ISO) |
| Login UI `/login` Quality | **Trasformata** in redirect a ERP `/login?source=quality` |
| Signup UI `/users/new` Quality | **Rimossa** o redirect a ERP `/admin/identity/new` |
| `applicative_signature.auth_user_id` | **Preservato come sempre** + colonna nuova `global_person_id` aggiunta |
| `audit_log` Quality | **Preservato** + colonna nuova `global_person_id` aggiunta |
| RLS Quality | **Estese**, NON sostituite: continueranno a usare `auth.uid()` ma anche `global_person_id` quando disponibile |

---

## 3. Fasi dismissione (dettaglio operativo)

### Fase A — Blocco signup Quality (T+2 settimane)

**Tecnico:**
```sql
-- Trigger Quality che rifiuta INSERT su auth.users senza global_person_id
CREATE OR REPLACE FUNCTION public.require_global_person_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.raw_app_meta_data ->> 'global_person_id' IS NULL THEN
    RAISE EXCEPTION 'auth.users: global_person_id mancante. Crea utente via Identity Layer ERP.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER block_quality_orphan_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.require_global_person_id();
```

**UI**: Quality `/users/new` mostra banner "Crea utente da ERP `/admin/identity/new`" + bottone deep-link.

**Acceptance**: tentativo signup diretto Quality → blocco con messaggio chiaro.

### Fase B — Dismissione UI gestione utenti Quality (T+1 mese)

**Tecnico:**
- Rimuovere voce sidebar Quality `nav.users`
- `/users` Quality → redirect 308 a ERP `/admin/identity?app=quality`
- `/users/[id]` Quality → redirect 308 a ERP `/admin/identity/[global_person_id]`

**Mantenere**: API Quality `getMyAssignments()` e funzionalità My Work che usano `person.id` localmente — quelle continuano a funzionare.

**Acceptance**: utente RQ Quality che vuole assegnare ruolo viene reindirizzato in ERP.

### Fase C — Login Quality via SSO ERP (T+2 mesi)

**Architettura SSO bridge:**

```
1. Utente apre Quality /protected-page
2. Quality middleware controlla cookies/session Supabase Quality
3. Se assente → redirect a ERP /login?return_to=https://quality.../protected-page&app=quality
4. Utente fa login ERP
5. ERP server action genera JWT firmato HMAC contenente:
     { global_person_id, email, name, role_quality, exp_5min, sig }
6. ERP redirect a Quality /auth/sso-callback?token=...
7. Quality verifica HMAC del token
8. Quality lookup global_person_id → trova person → trova auth_user_id
9. Quality crea sessione Supabase locale con magic link interno per quel auth_user_id
10. Cookie session Quality settato
11. Redirect a /protected-page
```

**Codice Quality nuovo** (`app/auth/sso-callback/route.ts`):
- Verifica HMAC `QUALITY_INTEGRATION_SECRET`
- Lookup `person.global_person_id`
- Genera magic link con `admin.auth.admin.generateLink()` per quel `auth_user_id`
- Imposta sessione

**Codice ERP nuovo** (`app/api/sso/quality-token/route.ts`):
- Auth check user ERP
- Lookup `identity_person` via `auth.uid()` → `profiles.global_person_id`
- Genera JWT HMAC con TTL 5min
- Redirect a Quality

**Acceptance**: Christian fa login ERP, click "Apri Quality", entra senza secondo login. Firma applicativa continua a funzionare con stesso `auth_user_id` Quality.

### Fase D — Emergency only (T+3 mesi, monitoring)

**Whitelist emergency** (env Quality):
```
EMERGENCY_LOGIN_EMAILS="c.capuano@proenesys.com,dba@enemek.com"
```

Login locale Quality consentito SOLO per email in whitelist. Tutti gli altri obbligati SSO.

**Monitoring**: dashboard "logins" che mostra:
- Login via SSO (atteso normale)
- Login locale (atteso solo whitelist)
- Tentativi falliti

### Fase E — Rimozione (T+4 mesi, APPROVAZIONE ESPLICITA)

```
- Quality /login UI restituisce 410 Gone
- Solo /auth/sso-callback resta attivo
- auth.users Quality non riceve più password hash per nuovi inviti
- Backup completo auth.users prima della fase
```

---

## 4. Cose che NON si toccano mai

| Cosa | Perché |
|------|--------|
| `person.auth_user_id` storici | Firme applicative + audit log dipendono — rompere = invalidare audit ISO |
| `applicative_signature` shape | Immutabile per design (audit ISO) |
| `audit_log` Quality | Storico azioni preservato per sempre |
| `entity_revision` Quality | Versioning documenti — non toccare |
| RLS su `quality_checklist_item`, `non_conformity`, `audit`, ecc. | Sono compliance ISO — modifica solo via Fase espressa |
| Mobile My Work flow | Operatori mobile dipendono — rompere = checklist non si possono compilare |
| Supplier portal Quality | Fornitori esterni dipendono — accesso separato OK |

---

## 5. Test obbligatori a ogni fase

```
□ Christian login OK
□ Costela login OK (pilota)
□ Operatore mobile login OK (My Work funzionante)
□ Firma applicativa: nuova NC firmata correttamente
□ Audit log: riga nuova con global_person_id popolato
□ RLS: utente operatore vede solo sue checklist
□ RLS: utente RQ vede tutto company
□ Logout cross-app: chiude entrambe le sessioni
□ Token SSO scaduto: rifiutato
□ Fornitore esterno (portal): login separato funziona
□ Notifiche utente: arrivano correttamente
□ Quality dashboard: numeri identici a prima
```

---

## 6. Riferimenti

- [`IDENTITY_CUTOVER_PLAN.md`](./IDENTITY_CUTOVER_PLAN.md) — 5 fasi macro
- [`RLS_SHARED_IDENTITY_PLAN.md`](./RLS_SHARED_IDENTITY_PLAN.md) — come RLS leggerà global_person_id
- [`IDENTITY_OPERATOR_AUDIT.md`](./IDENTITY_OPERATOR_AUDIT.md) — utenti reali
- [`IDENTITY_SSO_STRATEGY.md`](./IDENTITY_SSO_STRATEGY.md) — tecnologia SSO
