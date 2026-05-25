# Identity Management UI — Release Notes

**Versione:** v1.0 (2026-05-25)
**Scope:** UI ERP `/admin/identity/new` + endpoint Quality receiver `/api/integrations/erp/identity-upsert` per creare persone canoniche cross-app in modo governato.

**Stato:** ✅ deployato. Sostituisce il backfill SQL manuale.

---

## 1. Cosa rilasciamo

### 1.1 ERP: pagina `/admin/identity/new`
Form completo che permette a `super_admin_gruppo` di creare una persona canonica:
- **Anagrafica**: email primaria, nome, cognome, telefono, impresa primaria, locale, tipo persona, stato, note
- **App ERP**: checkbox abilitazione + ruolo (11 ruoli ERP) + scope (own/team/company/group/all)
- **App Quality**: checkbox abilitazione + ruolo (20 ruoli Quality) + scope
- **Banner informativo**: spiega cosa succederà dopo il save (4 step)
- **Validation**: server-side su email/nome/impresa/ruoli obbligatori se app abilitata

### 1.2 ERP: server action `createIdentityPersonAction()`
1. Auth check: solo `profiles.role IN ('super_admin','admin')` può procedere
2. INSERT `identity_person` con `global_person_id` auto-generato
3. INSERT `identity_role_assignment` per ogni app abilitata
4. Se Quality abilitata: chiama endpoint Quality `POST .../identity-upsert` con HMAC
5. Redirect a `/admin/identity` con messaggio esito (sync ok / sync failed / sync skipped)

### 1.3 Quality: endpoint `POST /api/integrations/erp/identity-upsert`
Riceve payload identità da ERP e:
1. Verifica HMAC + idempotency (stesso pattern webhook esistente)
2. Lookup company Quality via `global_id` shared (con fallback alla prima company se mismatch)
3. Lookup `role.id` da `role_code` ricevuto
4. UPSERT `person` Quality:
   - **Se esiste** (`global_person_id` già presente): UPDATE first_name, last_name, email, locale, company_id, role_id, active
   - **Se non esiste**: INSERT placeholder con `auth_user_id=NULL`
5. Logga in `sync_log` (direction=inbound)
6. Ritorna `{ok, person_id, created_new, note}`

---

## 2. Flusso end-to-end

```
super_admin compila form ERP /admin/identity/new
              │
              ▼
    server action createIdentityPersonAction
              │
              ├─► INSERT identity_person ERP
              ├─► INSERT identity_role_assignment (×2 se ERP+Quality)
              │
              ▼ (se Quality abilitata)
    POST Quality /api/integrations/erp/identity-upsert
        (HMAC firmato + idempotency)
              │
              ▼
    UPSERT person Quality (auth_user_id=NULL)
              │
              ▼
    redirect ERP /admin/identity?created=1&msg=...
```

**Risultato**: persona visibile nella tabella `/admin/identity` con badge ERP + Quality, ruoli granulari, scope per company.

---

## 3. Cosa NON fa (rispettato guardrail)

- ❌ NON crea `auth.users` ERP (richiede invite Supabase admin separato)
- ❌ NON crea `auth.users` Quality (NO doppio login, attesa SSO Fase C)
- ❌ NON manda email automatiche
- ❌ NON tocca login esistenti
- ❌ NON modifica RLS Quality
- ❌ NON elimina nessun utente

**Per accesso effettivo della persona**:
- ERP: invito Supabase admin via dashboard Supabase o CLI
- Quality: attesa SSO Bridge Fase C (raccomandato), oppure invito Supabase admin Quality manuale (genera doppio login, sconsigliato)

---

## 4. Auth guard ERP

```typescript
async function getCurrentSuperAdminPersonId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: prof } = await supabaseAdmin
    .from("profiles").select("id, role, global_person_id")
    .eq("id", user.id).maybeSingle();
  if (prof?.role !== "super_admin" && prof?.role !== "admin") return null;
  return prof.global_person_id;
}
```

Restituisce `global_person_id` del caller per usarlo come `assigned_by` nei record creati.

**TODO futuro**: spostare il check su `identity_role_assignment.role_code='super_admin_gruppo'` invece di leggere `profiles.role` legacy.

---

## 5. Smoke test (manuale post-deploy)

| # | Test | Atteso |
|---|------|--------|
| 1 | Christian apre `/admin/identity/new` | Vede form, no errore auth |
| 2 | Utente non super_admin apre `/admin/identity/new` | Submit redirect con errore "permesso negato" |
| 3 | Form vuoto submit | Errore "email obbligatoria" |
| 4 | Email senza @ submit | Errore "email non valida" |
| 5 | App ERP abilitata senza ruolo | Errore "ruolo ERP obbligatorio" |
| 6 | Nessuna app abilitata | Errore "almeno una app deve essere abilitata" |
| 7 | Form valido + solo ERP | Persona creata, sync_status='skipped', redirect ok |
| 8 | Form valido + ERP + Quality (con QUALITY_INTEGRATION_SECRET configurato) | Persona ERP + push Quality, sync_status='ok' |
| 9 | Form valido + Quality ma secret mancante | Persona ERP creata, sync_status='failed' con errore chiaro |
| 10 | Persona già esistente (email duplicata) | Errore UNIQUE constraint chiaro |
| 11 | Riapri persona Quality SQL: `SELECT * FROM person WHERE global_person_id=...` | Trovata, auth_user_id=NULL, role_id e company_id valorizzati |
| 12 | `/admin/identity` mostra la nuova persona | Sì, con badge app + ruoli |

---

## 6. Test pilota Costela (già eseguito)

Costela è stata creata via SQL manuale (vedi `IDENTITY_PILOT_COSTELA_REPORT.md`). Da ora in poi:
- Nuovi inviti → usare UI `/admin/identity/new`
- Backfill manuali → solo casi eccezionali (admin DBA)

---

## 7. Roadmap evolutiva

### Sub-fase A — già fatto ✅
- Form UI + server action + endpoint Quality
- Sync push HMAC

### Sub-fase B — futuro (richiede approvazione)
- Bottone "Invita su ERP" che chiama Supabase admin `invite-by-email`
- Bottone "Invita su Quality" che chiama Quality `invite-by-email`
- UI bulk import CSV per onboarding massivo dipendenti

### Sub-fase C — Fase C cutover (SSO)
- Quando SSO Bridge attivo: la creazione persona via UI automaticamente attiva il login (1 invito = entrambe le app)
- Vedi `IDENTITY_CUTOVER_PLAN.md`

---

## 8. File creati/modificati

| File | Tipo | Note |
|------|------|------|
| `app/admin/identity/new/page.tsx` (ERP) | Created | Form UI |
| `app/admin/identity/new/actions.ts` (ERP) | Created | Server action |
| `app/admin/identity/page.tsx` (ERP) | Modified | Aggiunto bottone "+ Nuova identità" |
| `app/api/integrations/erp/identity-upsert/route.ts` (Quality) | Created | Endpoint receiver HMAC |

---

## 9. Riferimenti

- [`IDENTITY_PILOT_COSTELA_REPORT.md`](./IDENTITY_PILOT_COSTELA_REPORT.md)
- [`IDENTITY_SSO_STRATEGY.md`](./IDENTITY_SSO_STRATEGY.md) sez. 4 step 3 (UI admin)
- [`IDENTITY_CUTOVER_PLAN.md`](./IDENTITY_CUTOVER_PLAN.md)
- [`IDENTITY_ROLE_PERMISSION_MATRIX.md`](./IDENTITY_ROLE_PERMISSION_MATRIX.md)
