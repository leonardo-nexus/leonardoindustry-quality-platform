# Identity Pilot Test — Costela Florea

**Versione:** v1.0 (2026-05-25)
**Scope:** test pilota Identity Bridge con secondo utente reale. Verifica che lo schema regge un caso d'uso non-trivial (Costela = admin ERP + futura RQ Quality scope=company).

**Risultato:** ✅ test verde sul lato dati. ⏳ login Quality NON ancora attivo per lei (volutamente — Fase C cutover bloccata).

---

## 1. Cosa è stato fatto

### 1.1 Lato ERP (`ndthklmimxfpiqlfxeyc`)

| Operazione | Risultato |
|------------|-----------|
| `INSERT identity_person` Costela | ✅ `global_person_id = 0240cf6e-c2ce-40e5-9339-19940e9ead74` |
| `UPDATE profiles` link `global_person_id` | ✅ profile id `7b05bfa6-...` ora referenzia Costela canonica |
| `UPDATE employees` link `global_person_id` | ✅ employee id `90742ca6-...` (HR record) collegato |
| `INSERT identity_account` ERP | ✅ `auth_provider=supabase_erp, auth_user_id=7b05bfa6-...` |
| `INSERT identity_role_assignment` ERP | ✅ `app_code=erp, role_code=admin_impresa, scope=company, company_id=Enemek Iberica` |
| `INSERT identity_role_assignment` Quality | ✅ `app_code=quality, role_code=responsabile_qualita, scope=company, company_id=Enemek Iberica` (PROPOSTO, da confermare prod) |

### 1.2 Lato Quality (`rdwaymddygcsfbwbqwtv`)

| Operazione | Risultato |
|------------|-----------|
| `INSERT person` Quality placeholder | ✅ `id=b745a786-001e-4112-9b1b-1de2c3d9c3b7` |
| `global_person_id` collegato | ✅ stesso UUID di ERP (`0240cf6e-...`) |
| `role_id` → `responsabile_qualita` | ✅ Costela vede solo company Enemek Iberica |
| `auth_user_id` | ⏳ **NULL** — Costela non può ancora loggarsi in Quality |
| Login Quality | ❌ NON attivato (intenzionalmente, attesa Fase C SSO) |

---

## 2. Vista aggregata `/admin/identity` post-pilot

```
PERSONE REGISTRATE: 2 attive

┌─────────────────────────────┬──────────────────────┬─────────┬────────────────────┐
│ Persona                     │ Impresa              │ Account │ Ruoli              │
├─────────────────────────────┼──────────────────────┼─────────┼────────────────────┤
│ Christian Capuano           │ Proenesys Europe     │ ERP+QUA │ super_admin_gruppo │
│ c.capuano@proenesys.com     │                      │         │ (scope=all)        │
├─────────────────────────────┼──────────────────────┼─────────┼────────────────────┤
│ Costela Florea              │ Enemek Engineering   │ ERP     │ admin_impresa      │
│ c.florea@enemek.com         │ Iberica              │ only    │ + responsabile_    │
│                             │                      │         │   qualita (company)│
└─────────────────────────────┴──────────────────────┴─────────┴────────────────────┘
```

UI `/admin/identity` ERP mostra correttamente Costela con:
- Badge ERP attivo, badge Quality assente (account Quality ancora non collegato)
- 2 righe ruoli (una ERP + una Quality, con scope=company e company name)

---

## 3. Test funzionali (eseguiti)

| Test | Atteso | Reale |
|------|--------|-------|
| `SELECT FROM identity_person WHERE email='c.florea@enemek.com'` | 1 record | ✅ 1 |
| `SELECT FROM identity_account WHERE linked_person_id=Costela` | 1 (solo ERP) | ✅ 1 |
| `SELECT FROM identity_role_assignment WHERE global_person_id=Costela` | 2 (ERP+Quality) | ✅ 2 |
| Quality `SELECT FROM person WHERE global_person_id=Costela` | 1 | ✅ 1 (con `auth_user_id=NULL`) |
| Quality `person.role` di Costela | `responsabile_qualita` | ✅ |
| Quality `person.company_id` di Costela | Enemek Iberica | ✅ |
| Login Quality come Costela | ⏳ non possibile (no auth_user_id) | ✅ comportamento atteso |
| Christian login Quality intatto | ✅ ancora attivo | ✅ |

---

## 4. Cosa NON è stato fatto (rispetto guardrail)

- ❌ NESSUNA modifica al login Quality
- ❌ NESSUN signup automatico Costela su `auth.users` Quality (richiede admin API + decisione esplicita)
- ❌ NESSUN cambio RLS Quality
- ❌ NESSUNA eliminazione utenti esistenti
- ❌ NESSUN signal di "invito" inviato a Costela via email
- ❌ NESSUN SSO bridge implementato

---

## 5. Conferme di principio

### 5.1 Schema identity regge il caso d'uso multi-ruolo
Costela ha **2 ruoli su 2 app diverse** (admin_impresa ERP + responsabile_qualita Quality), entrambi scope=`company`. Il vincolo `UNIQUE(global_person_id, app_code, company_id, role_code)` accetta correttamente.

### 5.2 Cross-DB sync via SQL diretto funziona (manuale)
Lo stesso `global_person_id` esiste su entrambi i project. La prossima sub-fase sarà automatizzare via endpoint webhook (non manuale).

### 5.3 Quality accetta `person` placeholder senza auth
Lo schema `person.auth_user_id` nullable permette di **predisporre persona** prima che lei abbia un account auth. Quando il login sarà attivato (Fase C SSO o invito Supabase admin), basterà popolare la colonna.

---

## 6. Cosa serve per chiudere il pilota (decisioni utente)

### Q1 — Vuoi che Costela possa effettivamente loggarsi in Quality ORA?

**Opzione 1A** — Invito Supabase admin classico (NON SSO):
- Eseguire `supabase admin invite c.florea@enemek.com` su project Quality
- Crea `auth.users` Quality + manda email magic link
- Costela clicca link, set password Quality, può loggarsi
- Aggiornare `person.auth_user_id` con UUID creato

Vantaggio: test reale subito. Costela può vedere Quality.
Svantaggio: doppio login (ERP + Quality separati). Non è ancora SSO.

**Opzione 1B** — Aspettare Fase C SSO Bridge:
- Costela resta predisposta ma offline su Quality
- Quando Fase C parte, lei accede via SSO ERP → Quality

Vantaggio: nessuna doppia gestione password.
Svantaggio: rimanda il test reale.

### Q2 — Confermi ruolo Quality per Costela = `responsabile_qualita` scope=company?
Alternative:
- `admin_impresa` Quality (più permessi, allinea con ERP)
- `responsabile_commessa` Quality (più ristretto)
- `responsabile_qualita` Quality (ISO standard per RQ) ⭐ proposto

### Q3 — Vuoi che il sync diventi automatico (endpoint webhook)?
Oggi è SQL diretto manuale. Per produzione serve:
- ERP UI `/admin/identity/new` con form invito
- Server action che chiama endpoint Quality `POST /api/integrations/erp/identity-upsert`
- Quality riceve, crea person + (opzionale) invita auth

---

## 7. Stato congelato

```
✅ Identity layer: 2 persone canoniche (Christian + Costela)
✅ Cross-app mapping verificato
✅ Quality continua a funzionare
✅ Login Quality intatto per Christian
⏳ Costela accesso Quality: in attesa decisione Q1
⏳ SSO bridge: in attesa decisione utente Fase C
```

---

## 8. Riferimenti

- [`IDENTITY_OPERATOR_AUDIT.md`](./IDENTITY_OPERATOR_AUDIT.md)
- [`IDENTITY_ROLE_PERMISSION_MATRIX.md`](./IDENTITY_ROLE_PERMISSION_MATRIX.md)
- [`IDENTITY_SSO_STRATEGY.md`](./IDENTITY_SSO_STRATEGY.md)
- [`IDENTITY_CUTOVER_PLAN.md`](./IDENTITY_CUTOVER_PLAN.md)
- [`QUALITY_ACCESS_DECOMMISSION_PLAN.md`](./QUALITY_ACCESS_DECOMMISSION_PLAN.md)
- [`RLS_SHARED_IDENTITY_PLAN.md`](./RLS_SHARED_IDENTITY_PLAN.md)
