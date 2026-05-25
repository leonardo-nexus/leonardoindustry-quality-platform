# Identity Role-Permission Matrix — Leonardo Gruppo

**Versione:** v1.0 (2026-05-25)
**Scope:** matrice canonica ruoli × app × capacità. Riferimento per Identity Bridge (Fase 3 matrimonio).

**Filosofia**: pochi compiti chiari, mai accesso largo "per comodità". Granularità per scope (own/team/company/group/all).

---

## 1. Ruoli canonici (17)

| Ruolo | Descrizione | Livello | Esempio persona |
|-------|-------------|:-------:|-----------------|
| `super_admin_gruppo` | Bypass RLS, accesso totale gruppo, modifica strutturale | 100 | Christian |
| `direzione_gruppo` | Dashboard gruppo, costi, escalation, KPI consolidato | 95 | CEO / CdA |
| `direzione_impresa` | Dashboard propria impresa, autorizzazione spese, contratti | 90 | AD impresa |
| `admin_impresa` | Configurazione impresa, gestione team, utenti impresa | 85 | IT manager impresa |
| `responsabile_qualita` | Quality Sentinel completo, audit, NC, blocchi qualifica | 80 | RQ certificato ISO |
| `responsabile_commessa` | Commessa propria: piano qualità, checklist, materiali, ordini | 75 | PM cantiere |
| `responsabile_acquisti` | Ordini fornitori, autorizzazione spesa, contratti commerciali | 75 | Buyer |
| `responsabile_saldatura` | WPS/WPQR/welder, audit saldatura UNE-EN 1090 | 70 | RS saldatura |
| `responsabile_sicurezza` | DUVRI, formazione, DPI, audit sicurezza | 70 | RSPP |
| `responsabile_ambiente` | Rifiuti, audit ambiente, ISO 14001 | 70 | RA |
| `auditor` | Audit interno cross-impresa, accesso read-only completo + create finding | 60 | Auditor interno gruppo |
| `revisore` | Approva documenti, certifica revisioni, firma | 55 | Revisore docs |
| `capo_cantiere` | Cantiere assegnato: timesheet, ricezione, checklist, evidenze | 50 | Capo cantiere |
| `capo_officina` | Officina: WPS, weld inspection, asset tarature | 50 | Capo officina |
| `magazzino` | Ricezione materiali, foto live, conteggio, firma, NC materiale | 45 | Magazziniere |
| `manutentore` | Asset/strumenti tarature, interventi, garanzie | 40 | Tecnico manutenzioni |
| `saldatore` | WPS proprie, weld con firma, qualifiche personali | 35 | Saldatore certificato |
| `operatore` | My Work, checklist assegnate, foto, firma proprie attività | 30 | Operaio cantiere |
| `fornitore` | Supplier portal: richieste documenti, upload qualifica | 20 | Fornitore esterno |
| `subappaltatore` | Cantieri assegnati: checklist proprie, evidenze | 20 | Subappaltatore |
| `cliente_dl` | Read-only DL del cliente: vede checklist/NC, no modifica | 15 | DL cliente esterno |
| `sola_lettura` | Read-only generale | 10 | Revisore esterno temporaneo |

---

## 2. Matrice capacità × app

### Legenda
- ✅ = accesso completo
- 🟡 = accesso parziale (scope ridotto: own/team/company)
- 👁 = read-only
- ❌ = no accesso
- 🛡 = vede solo widget/badge (deep-link verso master)

### 2.1 ERP capacità

| Ruolo | Anagrafica | Commesse | Ordini fornitore | Fatture | Pagamenti | Banche | Dipendenti | Veicoli | KPI gruppo | Settings |
|-------|:----------:|:--------:|:----------------:|:-------:|:---------:|:------:|:----------:|:-------:|:----------:|:--------:|
| super_admin_gruppo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| direzione_gruppo | ✅ | ✅ | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | ✅ | 👁 |
| direzione_impresa | 🟡 company | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 company | 👁 |
| admin_impresa | 🟡 | 🟡 | ❌ | 👁 | ❌ | ❌ | 🟡 | ❌ | 👁 company | 🟡 |
| responsabile_qualita | 👁 | 👁 | 👁 (per blocchi qualifica) | ❌ | ❌ | ❌ | ❌ | ❌ | 👁 | ❌ |
| responsabile_commessa | 👁 | 🟡 own | 🟡 own | 👁 own | ❌ | ❌ | 👁 | 👁 own | 👁 own | ❌ |
| responsabile_acquisti | 👁 | 👁 | ✅ | ✅ | 🟡 | 👁 | ❌ | ❌ | ❌ | ❌ |
| capo_cantiere/officina | ❌ | 👁 own | 👁 own | ❌ | ❌ | ❌ | 👁 team | 👁 | ❌ | ❌ |
| magazzino | ❌ | 👁 | 👁 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| operatore | ❌ | 👁 own | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| fornitore | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| cliente_dl | ❌ | 👁 (filtro proprie) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 2.2 Quality Control Plant capacità

| Ruolo | Quality Sentinel | NC | Audit | Qualif. fornitore | Checklist | Evidenze | Saldatura | WPS/WPQR | Materiali | Strumenti | KPI | My Work |
|-------|:----------------:|:--:|:-----:|:------------------:|:---------:|:--------:|:---------:|:--------:|:---------:|:---------:|:---:|:-------:|
| super_admin_gruppo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| direzione_gruppo | ✅ | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | ✅ | ✅ |
| direzione_impresa | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ✅ |
| responsabile_qualita | ✅ | ✅ | ✅ | ✅ approva | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | ✅ | ✅ |
| responsabile_commessa | 🟡 own | 🟡 own | 👁 | 👁 | ✅ own | ✅ own | 👁 | 👁 | 🟡 own | 👁 | 🟡 own | ✅ |
| responsabile_saldatura | 👁 | 🟡 saldatura | 🟡 saldatura | 👁 | 🟡 saldatura | 🟡 saldatura | ✅ | ✅ | 🟡 | 🟡 | 🟡 saldatura | ✅ |
| responsabile_sicurezza | 👁 | 🟡 sicurezza | 🟡 sicurezza | 👁 | 🟡 sicurezza | 🟡 | 👁 | 👁 | 👁 | 👁 | 🟡 sicurezza | ✅ |
| responsabile_ambiente | 👁 | 🟡 ambiente | 🟡 ambiente | 👁 | 🟡 ambiente | 🟡 | ❌ | ❌ | 🟡 | 👁 | 🟡 ambiente | ✅ |
| auditor | 👁 | ✅ create finding | ✅ | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | ✅ |
| revisore | 👁 | 👁 | 👁 | 👁 | 👁 approva | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | ✅ |
| capo_cantiere | 🟡 own | 🟡 own create | 👁 | 👁 | ✅ own | ✅ own | 👁 | 👁 | 🟡 own | 👁 | 🟡 own | ✅ |
| capo_officina | 🟡 own | 🟡 own create | 👁 | 👁 | ✅ own | ✅ own | 🟡 own | 🟡 own | 👁 | ✅ own | 🟡 own | ✅ |
| magazzino | ❌ | 🟡 materiale | ❌ | ❌ | ❌ | ✅ ricezione | ❌ | ❌ | ✅ ricezione | ❌ | ❌ | ✅ |
| manutentore | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ intervento | ❌ | ❌ | ❌ | ✅ asset | ❌ | ✅ |
| saldatore | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ saldatura | 👁 | 👁 | ❌ | ❌ | ❌ | ✅ |
| operatore | ❌ | ❌ | ❌ | ❌ | 🟡 assegnate | 🟡 assegnate | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| fornitore | ❌ | 👁 proprie | ❌ | 🟡 proprie carica doc | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 supplier-portal |
| cliente_dl | 👁 own project | 👁 own project | 👁 own project | ❌ | 👁 own | 👁 own | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Esempi pratici concreti

### 3.1 Christian (super_admin_gruppo)
- **ERP**: vede tutto, modifica tutto, configura sistema
- **Quality**: vede tutto, approva tutto, bypass RBAC (`hasPermission` ritorna sempre true per `admin_gruppo`)
- **Audit log**: ogni azione tracciata con `global_person_id` univoco

### 3.2 Costela Florea (admin ERP, candidata responsabile_qualita Quality)
- **ERP**: gestione impresa Enemek
- **Quality** (dopo invito): RQ scope `company=Enemek`, approva qualifiche fornitori
- **Audit log**: stesso `global_person_id` in entrambe le app

### 3.3 Operaio cantiere senza email (es. Mario Bozzetto)
- **ERP**: 0 accesso digitale (`employees` HR only)
- **Quality**: 0 accesso oggi; in futuro: login via SMS/QR + ruolo `operatore` mobile-only
- **Audit log**: `employee_id` ERP + futuro `global_person_id` quando invitato

### 3.4 Fornitore esterno (es. "2 A FORNITURE INDUSTRIALI SRL")
- **ERP**: counterparty record (no auth)
- **Quality**: futuro `supplier-portal` con login dedicato, ruolo `fornitore`, scope `own` (vede solo proprie qualifiche/documenti)
- **Audit log**: tracciato come azione fornitore

---

## 4. Regole transversali

### 4.1 Scope reductions
- `own` → vede solo record dove `created_by = persona` o `assigned_to = persona`
- `team` → vede record del proprio team (FK `team_member`)
- `company` → vede record della propria `company_id`
- `group` → vede record di tutte le company del gruppo
- `all` → bypass (solo super_admin_gruppo / direzione_gruppo)

### 4.2 Ruoli combinabili
Una persona può avere **più ruoli contemporaneamente** in app diverse:
- Christian: super_admin_gruppo ERP + admin_gruppo Quality
- Costela: admin ERP + responsabile_qualita Quality (futuro)

Ma **non più ruoli nella stessa app sulla stessa company** (decisione di principio per chiarezza).

### 4.3 Time-bound roles
Auditor esterni o subappaltatori possono avere `expires_at` non-null. Il sistema deve auto-revocare il ruolo alla scadenza.

### 4.4 Firma applicativa
Ogni azione critica deve registrare:
```
{
  global_person_id,
  auth_user_id (app-specific),
  email,
  role_code (al momento dell'azione),
  app_source,
  company_id,
  timestamp,
  device, ip, geolocation (mobile)
}
```

---

## 5. Tabella di transizione (oggi → futuro)

| Aspetto | Oggi | Domani (post Identity Bridge) |
|---------|------|-------------------------------|
| Auth Christian | 2 account separati (ERP + Quality) | 2 account, ma stesso `global_person_id` |
| Audit log Christian | 2 trail separati | 2 trail aggregabili via `global_person_id` |
| Onboarding nuovo utente | Doppio invito (ERP + Quality) | Singolo invito, attivazione cross-app |
| Ruolo super_admin | `profiles.role='super_admin'` ERP + `person.role_id` Quality | `identity_role_assignment` con record per ogni app |
| Login | 2 login distinti | 1 login (Opzione A) o 1 sessione cross-app (Opzione B) |

---

## 6. Riferimenti

- [`IDENTITY_OPERATOR_AUDIT.md`](./IDENTITY_OPERATOR_AUDIT.md) — quadro reale utenti oggi
- [`IDENTITY_SSO_STRATEGY.md`](./IDENTITY_SSO_STRATEGY.md) — opzioni implementazione tecnica
- [`DATA_OWNERSHIP_MATRIX.md`](./DATA_OWNERSHIP_MATRIX.md) sez. 5 — punto critico utenti separati
