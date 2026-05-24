# ERP ↔ Quality Control Plant — Test & Gap Analysis

Documento operativo per verificare la catena di integrazione tra **ERP gruppo Leonardo Industries** e
**Quality Control Plant** (questo repo). Pensato per il team ERP, il team Quality e l'IT direzione gruppo.

> Principio architetturale: **un solo cuore qualità collegato all'ERP**, niente moduli qualità duplicati.
> - ERP = sistema operativo commerciale/amministrativo
> - Quality Control Plant = motore qualità ufficiale (qualifica, score, blocco ordini, NC, audit)
> - Tutto il bridge passa da `global_id` + `sync_outbox/log/conflict`
> - Nessun ordine può essere creato in ERP ignorando lo stato qualità del fornitore

---

## 0. Env vars richieste

| Variabile                       | Lato     | Uso                                                                 |
|---------------------------------|----------|----------------------------------------------------------------------|
| `QUALITY_INTEGRATION_SECRET`    | Quality  | Verifica HMAC sui webhook/quality-status in ingresso da ERP         |
| `ERP_INTEGRATION_URL`           | Quality  | URL dell'endpoint POST esposto da ERP per ricevere il push Quality  |
| `ERP_INTEGRATION_SECRET`        | Quality  | Firma HMAC dei payload outbound verso ERP                            |
| `ERP_RETURN_URL`                | Quality  | URL "Torna a ERP" mostrato nel widget e nella scheda qualifica       |
| `CRON_SECRET`                   | Quality  | Auth header per `/api/cron/*` e `POST /api/integrations/erp/push`   |
| `NEXT_PUBLIC_APP_URL`           | Quality  | Base URL pubblico Quality (usato nei deep link e iframe)             |

Healthcheck immediato del setup:

```bash
curl -s https://quality.leonardo.../api/integrations/erp/status | jq
```

Risposta attesa:

```json
{
  "status": "ok",
  "outbox": { "pending": 0, "failed": 0 },
  "unresolved_conflicts": 0,
  "last_inbound_at": "2026-05-24T08:15:00.000Z",
  "last_outbound_at": "2026-05-24T08:18:00.000Z",
  "integration_secret_configured": true,
  "erp_url_configured": true
}
```

Se uno dei due `*_configured` è `false` → vedi sezione **Gap analysis**.

---

## 1. Schema HMAC

Tutte le richieste autenticate (webhook + quality-status + push) condividono lo stesso schema.

**Headers richiesti su ogni chiamata firmata:**
- `X-Timestamp`: epoch seconds (es. `1748073600`)
- `X-Signature`: `HMAC-SHA256(payload, secret)` in hex
- `X-Idempotency-Key`: id univoco lato chiamante (usato per dedup)

**Payload firmato**:
- `payload = "${timestamp}.${body}"` per POST con body
- `payload = "${timestamp}."` per GET (body vuoto)

**Vincoli**:
- `|now - timestamp| <= 300s` (5 min)
- Confronto firma in **time-safe compare**
- Idempotency-key OBBLIGATORIO; richieste duplicate ritornano 200 `{deduplicated:true}`

**Calcolo HMAC (esempio bash + openssl):**

```bash
SECRET="<QUALITY_INTEGRATION_SECRET>"
BODY='{"action":"supplier.updated","global_id":"...","fields":{"email":"x@y.it"}}'
TS=$(date +%s)
SIG=$(printf '%s' "${TS}.${BODY}" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
echo "X-Timestamp: $TS"
echo "X-Signature: $SIG"
```

**Calcolo HMAC (Node.js)**:

```js
import { createHmac } from "node:crypto";
const sig = createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");
```

---

## 2. Endpoint Quality lato ERP

### 2.1 `GET /api/integrations/erp/suppliers/[globalId]/quality-status`

**Scopo:** ERP lo chiama PRIMA di creare un ordine. Se `blocked_for_orders=true` → rifiuta l'ordine.

```bash
GLOBAL_ID="demo-erp-quality-d9ffb771"
TS=$(date +%s)
SIG=$(printf '%s' "${TS}." | openssl dgst -sha256 -hmac "$QUALITY_INTEGRATION_SECRET" | awk '{print $2}')

curl -s "https://quality.leonardo.../api/integrations/erp/suppliers/${GLOBAL_ID}/quality-status" \
  -H "X-Timestamp: $TS" \
  -H "X-Signature: $SIG" \
  -H "X-Idempotency-Key: erp-check-$(uuidgen)" | jq
```

**Risposta attesa (200):**

```json
{
  "supplier_global_id": "demo-erp-quality-d9ffb771",
  "qualification_status": "qualified_with_reservation",
  "score": 42,
  "blocked_for_orders": true,
  "block_reasons": ["Score < 60", "DURC scaduto"],
  "valid_until": "2026-12-31",
  "missing_documents": ["durc", "iso_9001"],
  "last_updated_at": "2026-05-24T08:15:00.000Z"
}
```

**Risposta 404 (fornitore sconosciuto in Quality):**

```json
{
  "error": "Fornitore non trovato in Quality",
  "blocked_for_orders": true,
  "block_reasons": ["Fornitore non qualificato in Quality"]
}
```

> ⚠️ Anche su 404 ERP **deve bloccare** l'ordine: assenza in Quality = non qualificato.

### 2.2 `POST /api/integrations/erp/webhook`

**Scopo:** ERP notifica Quality di modifiche all'anagrafica fornitore (email, telefono, indirizzo, P.IVA…).

Quality **non sovrascrive mai** i campi protetti:
`score, qualification_status, blocked_for_orders, block_reasons, score_breakdown, valid_until, approved_by, approved_at`.

Se ERP cerca di scriverli → riga su `sync_conflict`, **nessun overwrite**, risposta 200 con `conflicts:[...]`.

```bash
BODY='{"action":"supplier.updated","global_id":"demo-erp-quality-d9ffb771","erp_supplier_id":"SUP-DEMO-ERP-QUALITY-001","fields":{"email":"nuova@fornitore.it","phone":"+39 02 1234567"}}'
TS=$(date +%s)
SIG=$(printf '%s' "${TS}.${BODY}" | openssl dgst -sha256 -hmac "$QUALITY_INTEGRATION_SECRET" | awk '{print $2}')

curl -sX POST "https://quality.leonardo.../api/integrations/erp/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Timestamp: $TS" \
  -H "X-Signature: $SIG" \
  -H "X-Idempotency-Key: erp-evt-$(uuidgen)" \
  -d "$BODY" | jq
```

**Risposta attesa (200):**

```json
{ "ok": true, "quality_id": "...", "fields_updated": ["email","phone"], "conflicts": [] }
```

**Esempio conflitto (ERP tenta score=99):**

```bash
BODY='{"action":"supplier.updated","global_id":"demo-erp-quality-d9ffb771","fields":{"score":99,"qualification_status":"qualified_excellent"}}'
# stessa firma...
```

Risposta (200, ma con conflicts):

```json
{ "ok": true, "quality_id": "...", "fields_updated": [], "conflicts": ["score","qualification_status"] }
```

Le righe in `sync_conflict` vengono mostrate in `/integrations/erp-quality` e devono essere **risolte manualmente** dal Responsabile Qualità.

### 2.3 `GET /api/integrations/erp/status`

Healthcheck. **Nessuna auth** (volutamente pubblico per monitoring).

```bash
curl -s https://quality.leonardo.../api/integrations/erp/status | jq
```

### 2.4 `POST /api/integrations/erp/push`

Trigger del worker outbox (cron daily o manuale). Legge `sync_outbox` pending, firma e fa POST a `ERP_INTEGRATION_URL`.

```bash
curl -sX POST "https://quality.leonardo.../api/integrations/erp/push" \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```

oppure (chiamato dal cron Vercel):

```bash
curl -sX POST "https://quality.leonardo.../api/integrations/erp/push" -H "x-vercel-cron: 1"
```

Risposta:

```json
{ "ok": true, "sent": 3, "failed": 0, "total": 3 }
```

Se `ERP_INTEGRATION_URL/SECRET` non sono configurati: ritorna `{ok:true, skipped:true, reason:"..."}` senza errore (fail-soft).

---

## 3. Test end-to-end automatico

Pagina UI dedicata: **`/integrations/erp-quality/test`** (visibile a `direzione_gruppo`, `direzione_impresa`, `responsabile_qualita`).

Esegue 5 scenari in sequenza chiamando gli endpoint interni:

1. **Quality-status endpoint** — GET con HMAC valido sulla qualifica demo
2. **Webhook simulato** — POST cambio email (campo NON protetto)
3. **Conflitto su campo protetto** — POST tentativo `score=99` → deve produrre `conflicts:["score","qualification_status"]`
4. **Healthcheck** — GET `/api/integrations/erp/status`
5. **Blocco ordini** — verifica DB che la qualifica demo abbia `score<60` e `blocked_for_orders=true`

I risultati vengono mostrati con badge pass/fail e payload espandibile per debug.

---

## 4. Catena end-to-end attesa

```
ERP                                  Quality Control Plant
 │                                    │
 │ 1. supplier.created (webhook) ───►│  upsert supplier_qualification
 │                                    │  status=da_qualificare
 │                                    │
 │                                    │  2. RQ compila qualifica
 │                                    │  → score, status, blocked_for_orders
 │                                    │  → riga in sync_outbox
 │                                    │
 │ 3. POST /api/integrations/erp ◄────│  cron daily push
 │    (signed)                        │
 │                                    │
 │ 4. ERP UI mostra widget iframe ────│  /embed/supplier-status/[globalId]
 │    /embed/...?ts=&sig=             │  (signed URL, ±5 min)
 │                                    │
 │ 5. CreateOrder() ─►                │
 │    GET .../quality-status ────────►│
 │    ◄── blocked_for_orders:true     │
 │                                    │
 │ 6. ❌ ORDINE RIFIUTATO             │
 │    UI: "Apri in Quality" → /suppliers/qualification/[id]?source=erp
```

---

## 5. Widget iframe embeddable (per UI ERP)

ERP può embeddare nel proprio dettaglio fornitore:

```html
<iframe
  src="https://quality.leonardo.../embed/supplier-status/<GLOBAL_ID>?ts=<TS>&sig=<SIG>"
  width="100%" height="320" style="border:0">
</iframe>
```

dove `sig = HMAC-SHA256("<GLOBAL_ID>.<TS>", QUALITY_INTEGRATION_SECRET)` (URL valido 5 min).

Calcolo lato ERP (Node):

```js
const ts = Math.floor(Date.now() / 1000);
const sig = createHmac("sha256", QUALITY_INTEGRATION_SECRET)
              .update(`${globalId}.${ts}`).digest("hex");
const url = `${QUALITY_BASE}/embed/supplier-status/${globalId}?ts=${ts}&sig=${sig}`;
```

Il widget mostra: nome, score colorato, status, blocco ordini con motivi, doc mancanti, link "Apri in Quality" + "Torna a ERP".

---

## 6. Gap analysis — cosa serve dall'altro lato

### ✅ Pronto in Quality (questo repo)

- Schema `supplier_qualification` + `global_id` univoco + 17 ruoli RLS
- `sync_outbox` + `sync_log` + `sync_conflict` + `integration_mapping`
- Endpoint webhook con HMAC ±5min, idempotency, campi protetti, sync_conflict automatico
- Endpoint `quality-status` con HMAC e include documenti mancanti
- Endpoint `status` healthcheck
- Endpoint `push` outbox worker (Vercel cron daily)
- UI `/suppliers/qualification` + `/integrations/erp-quality` + `/integrations/erp-quality/test`
- Widget `/embed/supplier-status/[globalId]` firmato
- Demo fornitore `SUP-DEMO-ERP-QUALITY-001` (`global_id=demo-erp-quality-d9ffb771`, `score=42`, `blocked_for_orders=true`)
- Localizzazione IT/ES, audit log su ogni edit, snapshot score giornaliero

### ⚠️ Richiede intervento team ERP

| Item | Cosa serve | Dove |
|------|-----------|------|
| **1. Endpoint ricezione push Quality** | ERP deve esporre `POST` che accetta payload `{action, global_id, payload}` con stesso schema HMAC. Quality lo chiama tramite `ERP_INTEGRATION_URL`. | ERP backend |
| **2. Webhook out su modifica fornitore** | ERP deve chiamare `POST /api/integrations/erp/webhook` su Quality ad ogni `INSERT/UPDATE` di `supplier`. | ERP backend |
| **3. Gate pre-ordine** | Prima di `INSERT` su tabella ordini ERP, chiamata sincrona a `GET .../quality-status`. Se `blocked_for_orders=true` o HTTP 404 → rifiuto. | ERP backend (transazione) |
| **4. UI ERP "Qualifica Fornitori"** | Rimuovere modulo qualità interno. Sostituire con: deep link `https://quality.../suppliers/qualification/[id]?source=erp` + iframe widget. | ERP frontend |
| **5. Mapping anagrafiche legacy** | Per ogni supplier ERP esistente, popolare `global_id` (UUID) e propagarlo a Quality via webhook bulk one-shot. | ERP DBA + Quality `integration_mapping` |
| **6. Risoluzione conflitti** | Definire SOP: quando `sync_conflict` viene creato chi decide (RQ vs commerciale)? La UI Quality lo permette ma serve owner. | Direzione gruppo |
| **7. Banca dati P.IVA/codice fiscale** | Concordare se la fonte autorevole è ERP (probabile) e bloccare modifica `tax_id` lato Quality. | Decisione organizzativa |

### 🔐 Sicurezza / deploy

| Item | Stato | Note |
|------|-------|------|
| `QUALITY_INTEGRATION_SECRET` | ✅ da configurare in Vercel | Generare 64+ char random; condividere col team ERP via canale sicuro |
| `ERP_INTEGRATION_SECRET` | ⏳ pending | Dipende dall'endpoint ERP (item 1) |
| `ERP_INTEGRATION_URL` | ⏳ pending | Dipende dall'endpoint ERP (item 1) |
| `ERP_RETURN_URL` | ✅ da configurare | URL della home fornitori ERP |
| `CRON_SECRET` | ✅ già configurato | Usato anche da `/api/cron/quality-escalations` e snapshot |
| RLS in produzione | ✅ attivo | 17 ruoli, mai disattivare |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ server-only | Mai esporre nel client (verifica typecheck) |

### 🧪 Smoke test post-deploy (ordine consigliato)

1. `GET /api/integrations/erp/status` → tutti gli `_configured=true`
2. Aprire `/integrations/erp-quality/test` come `direzione_gruppo` → 5 test pass
3. Aprire `/suppliers/qualification` → vedo demo `SUP-DEMO-ERP-QUALITY-001` con score 42 rosso
4. Click "Forza push verso ERP" → `sync_outbox` vede riga `sending` → `sent` (se ERP_URL configurato) o `failed` con motivo chiaro
5. Iframe widget: aprire `/embed/supplier-status/demo-erp-quality-d9ffb771?ts=...&sig=...` in browser → widget rendered con banner rosso "ORDINI BLOCCATI"
6. Dal lato ERP: chiamata `quality-status` su `demo-erp-quality-d9ffb771` → `blocked_for_orders:true` → UI ERP deve rifiutare la creazione ordine

---

## 7. Troubleshooting

| Sintomo | Causa probabile | Soluzione |
|--------|----------------|-----------|
| `401 Signature mismatch` | Secret diverso ai due lati | Riallineare `QUALITY_INTEGRATION_SECRET` |
| `401 Timestamp troppo vecchio` | Clock drift > 5 min | Sync NTP server ERP |
| `401 X-Idempotency-Key header mancante` | ERP non genera UUID per richiesta | Implementare generazione (es. `crypto.randomUUID()`) |
| `404 Fornitore non trovato in Quality` | `global_id` non propagato | Webhook one-shot da ERP per supplier legacy |
| `sync_outbox.status=failed` cronico | ERP_INTEGRATION_URL irraggiungibile o 5xx | Verificare endpoint ERP up + auth |
| Conflict creato ma RQ non lo vede | Filtro `resolved=false` mancante in UI | UI già filtra; verificare permission |
| Widget iframe: `URL scaduta (>300s)` | Generato troppo presto | ERP deve rigenerare a ogni rendering, non cache |

---

## 8. Riferimenti codice

- HMAC helper: [lib/integration/hmac.ts](../lib/integration/hmac.ts)
- Webhook in: [app/api/integrations/erp/webhook/route.ts](../app/api/integrations/erp/webhook/route.ts)
- Quality-status: [app/api/integrations/erp/suppliers/[globalId]/quality-status/route.ts](../app/api/integrations/erp/suppliers/[globalId]/quality-status/route.ts)
- Push worker: [app/api/integrations/erp/push/route.ts](../app/api/integrations/erp/push/route.ts)
- Healthcheck: [app/api/integrations/erp/status/route.ts](../app/api/integrations/erp/status/route.ts)
- Widget embed: [app/embed/supplier-status/[globalId]/page.tsx](../app/embed/supplier-status/[globalId]/page.tsx)
- Test suite UI: [app/(app)/integrations/erp-quality/test/](../app/(app)/integrations/erp-quality/test/)
- Console integrazione: [app/(app)/integrations/erp-quality/page.tsx](../app/(app)/integrations/erp-quality/page.tsx)
