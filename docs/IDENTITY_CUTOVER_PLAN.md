# Identity Cutover Plan — ERP ↔ Quality

**Versione:** v1.0 (2026-05-25)
**Scope:** roadmap graduale per portare Quality da "auth autonoma" a "consumer del layer identità condiviso ERP". Niente cutover di colpo. Nessuna interruzione operativa.

**Stato:** Identity Bridge Opzione B applicato. Christian unico utente migrato. Schema e UI pronti. Cutover NON eseguito.

---

## 1. Cosa è già fatto (Fase 3 Identity Bridge)

| Step | Stato | Note |
|------|-------|------|
| Schema `identity_person/account/role_assignment` su ERP | ✅ | Migration `2026-05-25_identity_bridge_schema.sql` |
| `global_person_id` su `profiles` + `employees` ERP | ✅ | FK opzionale (nullable) |
| `global_person_id` su `person` Quality | ✅ | FK opzionale (nullable, text) |
| Backfill Christian | ✅ | `08284bee-2ca5-4a51-9073-3231f95ece7d` cross-app |
| UI `/admin/identity` ERP read-only | ✅ | Vede registry + account + ruoli |
| Quality login intatto | ✅ | Nessuna modifica auth Quality |
| RLS Quality intatta | ✅ | Nessuna modifica policy |
| Firme applicative intatte | ✅ | `applicative_signature` continua a usare `auth_user_id` |
| Audit trail intatto | ✅ | `audit_log` Quality continua a tracciare normalmente |

---

## 2. Strategia: "vecchia porta resta aperta finché la nuova è testata"

```
                 OGGI                          DOMANI (post cutover)
        ┌──────────────┐                ┌──────────────┐
        │ Login Quality │                │ Login ERP     │
        │ separato      │  ────────►    │ (SSO)         │
        │ (operativo)   │                │ canonico      │
        └──────────────┘                └──────────────┘
                                              │
                                              ▼
                                        ┌──────────────┐
                                        │ Quality      │
                                        │ riceve       │
                                        │ identità da  │
                                        │ Identity     │
                                        │ Layer ERP    │
                                        └──────────────┘
```

Quality oggi sa identificare l'utente Christian con `auth.uid() = 7c0d948f`. Domani saprà che `auth.uid() = 7c0d948f` corrisponde a `global_person_id = 08284bee` e potrà aggregare audit, ruoli, permessi.

**Niente big-bang.** Solo aggiunta di una colonna `global_person_id` che si propaga gradualmente.

---

## 3. Fasi cutover (5 sub-fasi controllate)

### Fase A — Bloccare nuove registrazioni Quality autonome
- Quality `/users/new` viene rimossa dalla UI ERP-side onboarding
- Quality `auth.users` accetta solo signup tramite endpoint esposto da Identity Layer ERP
- Trigger DB su `auth.users` Quality che richiede `raw_app_meta_data.global_person_id` presente

**Rischio**: 🟢 basso (nessuno crea utenti Quality manualmente)
**Reversibilità**: ✅ trigger DROP

### Fase B — Nascondere gestione utenti Quality autonoma
- Pagina Quality `/users/new` rimossa o redirect a ERP `/admin/identity/new`
- Pagina Quality `/users` mostra banner "Aggiungi utenti tramite Identity Layer condiviso → ERP"
- Modifiche ruolo Quality solo via Identity Layer (push sync)

**Rischio**: 🟡 medio (UX cambia per RQ Quality)
**Reversibilità**: ✅ git revert

### Fase C — Login Quality solo tramite SSO/shared identity
- Login Quality reindirizza su ERP `/login?source=quality`
- Dopo auth ERP, ERP genera token firmato HMAC contenente `global_person_id`
- Quality `/auth/callback` lo verifica e crea sessione Supabase locale per quel `auth_user_id`
- Risultato: login unico, ma `auth_user_id` Quality storico resta intatto

**Rischio**: 🟡 medio (cambio flow login utente)
**Reversibilità**: ✅ feature flag rollback

### Fase D — Emergency admin Quality temporaneo
- Anche dopo Fase C, mantenere bypass login locale Quality per:
  - Christian (super_admin gruppo)
  - DBA emergency (account dedicato)
- Tutti gli altri obbligati al SSO

**Rischio**: 🟢 basso (continuity per amministratori)
**Reversibilità**: ✅

### Fase E — Rimozione completa vecchio accesso Quality
- Solo dopo 30+ giorni di Fase D senza incidenti
- `auth.users` Quality svuotato dai non-emergency
- UI login Quality non più accessibile direttamente
- Restano `person.auth_user_id` per audit storico, ma nuovi login forzati SSO

**Rischio**: 🔴 alto (irreversibile pratico)
**Reversibilità**: 🟡 solo via re-create user + re-mapping
**Pre-condizione**: approvazione direzione gruppo

---

## 4. Pre-condizioni per ogni fase

| Fase | Pre-condizione tecnica | Pre-condizione organizzativa |
|------|------------------------|------------------------------|
| A | Endpoint Identity Layer attivo ERP | Comunicazione team: "non creare più utenti Quality manualmente" |
| B | Sync ERP→Quality identity funzionante con HMAC | Training RQ Quality su nuovo flow |
| C | Endpoint SSO callback Quality + token verifier | Test approfondito con utenti pilota (Costela?) |
| D | Lista whitelist emergency definita | Approvazione DBA emergency procedure |
| E | 0 incidenti per 30 giorni in fase D | Approvazione direzione gruppo |

---

## 5. Test E2E richiesti prima di ogni avanzamento

### Prima di Fase A
- [ ] Christian crea account nuovo via Identity Layer → ricevuto in entrambe le app
- [ ] Tentativo signup Quality diretto → rifiutato con messaggio chiaro
- [ ] Sync log Identity Layer mostra evento

### Prima di Fase C
- [ ] Christian fa login da ERP → vede Quality senza ulteriore login
- [ ] Token HMAC verificato lato Quality
- [ ] Audit log Quality registra `auth_user_id` storico + `global_person_id`
- [ ] Firme applicative continuano a funzionare (test creazione NC fittizia, firma)
- [ ] RLS Quality continua a filtrare correttamente
- [ ] Logout cross-app: logout da ERP → invalida sessione Quality

### Prima di Fase E
- [ ] 30 giorni Fase D senza incidenti
- [ ] Audit cross-app aggregato funziona
- [ ] Backup auth.users Quality salvato
- [ ] Lista utenti che hanno fatto login negli ultimi 90 giorni — tutti via SSO

---

## 6. Rollback per fase

| Fase | Rollback step |
|------|---------------|
| A | DROP trigger su `auth.users` Quality |
| B | Ripristina UI `/users/new` Quality + sidebar entry |
| C | Disabilita feature flag `SSO_ENABLED` Quality, ripristina login locale |
| D | Tutti utenti diventano emergency (rimuovi obbligo SSO) |
| E | Ricreazione utenti da backup + re-mapping `global_person_id` (lavoroso) |

---

## 7. Cronoprogramma suggerito

| T+ | Fase | Note |
|----|------|------|
| +0 (oggi) | Identity Bridge applicato | ✅ |
| +1 settimana | Test interno + 2-3 utenti pilota | Invito Costela come responsabile_qualita |
| +2 settimane | Fase A (blocco signup Quality) | |
| +1 mese | Fase B (UI dismissione) | |
| +2 mesi | Fase C (SSO login) | |
| +3 mesi | Fase D (emergency only) | Monitoring intenso |
| +4 mesi | Fase E (rimozione vecchio) | Solo con approvazione esplicita |

---

## 8. Cosa NON fare

- ❌ Eliminare `person.auth_user_id` storici (rompe firme + audit)
- ❌ Migrare auth.users Quality dentro ERP (mai)
- ❌ Cambiare RLS Quality di colpo senza test
- ❌ Disattivare Quality login fisicamente prima della Fase E
- ❌ Forzare cambio password utenti (mai)
- ❌ Cancellare `person` Quality (mai)

---

## 9. Riferimenti

- [`IDENTITY_OPERATOR_AUDIT.md`](./IDENTITY_OPERATOR_AUDIT.md)
- [`IDENTITY_ROLE_PERMISSION_MATRIX.md`](./IDENTITY_ROLE_PERMISSION_MATRIX.md)
- [`IDENTITY_SSO_STRATEGY.md`](./IDENTITY_SSO_STRATEGY.md)
- [`QUALITY_ACCESS_DECOMMISSION_PLAN.md`](./QUALITY_ACCESS_DECOMMISSION_PLAN.md) — dettaglio dismissione lato Quality
- [`RLS_SHARED_IDENTITY_PLAN.md`](./RLS_SHARED_IDENTITY_PLAN.md) — come RLS userà global_person_id
