# Leonardo Site Control (ERP) — Patch lato ERP per integrare Quality Control Plant

Documento per il **team che gestisce Leonardo Site Control**. Contiene tutto il codice copia-incolla
necessario per far comparire l'integrazione *nell'uso pratico* dell'ERP.

> ⚠️ Senza questa patch, lato ERP NON si vede nulla di Quality.
> Tutto il lavoro nel repo `leonardoindustry-quality-platform` è la metà server della catena.
> L'altra metà — endpoint receiver, gate pre-ordine, UI fornitore — vive nel codice ERP.

Stack assunto: **Next.js 14 App Router + Supabase + TypeScript**, allineato a `leonardoindustry-quality-platform`.

---

## 0. Checklist di completamento

Solo quando tutti questi punti hanno ✅, l'utente vedrà l'integrazione attiva in ERP:

- [ ] **N0.** 4 env vars configurate su Vercel ERP
- [ ] **N1.** Migration: aggiunta colonna `global_id` (uuid) a tabella `supplier` ERP
- [ ] **N2.** Endpoint receiver `POST /api/integrations/quality/inbound` per ricevere push da Quality
- [ ] **N3.** Webhook OUT: ogni `INSERT/UPDATE` su `supplier` ERP → chiamata firmata a Quality
- [ ] **N4.** Gate pre-ordine: server action `createOrderAction()` chiama `quality-status` PRIMA del save
- [ ] **N5.** UI fornitore ERP: rimosso vecchio modulo qualifica + deep-link "Apri in Quality" + iframe widget
- [ ] **N6.** Backfill one-shot: popolare `global_id` su tutti i supplier ERP esistenti
- [ ] **N7.** Smoke test end-to-end sulla demo `SUP-DEMO-ERP-QUALITY-001`

---

## N0. Env vars (Vercel project Leonardo Site Control)

| Variabile                  | Valore                                                    |
|----------------------------|-----------------------------------------------------------|
| `QUALITY_INTEGRATION_URL`  | `https://quality.leonardo.../api/integrations/erp`        |
| `QUALITY_INTEGRATION_SECRET` | **stesso** valore configurato in Quality (HMAC condiviso) |
| `QUALITY_APP_URL`          | `https://quality.leonardo...` (base, per deep-link + iframe) |
| `QUALITY_WEBHOOK_PATH`     | `/api/integrations/erp/webhook` (default)                 |

> `QUALITY_INTEGRATION_SECRET` è la **stessa stringa** sia in ERP che in Quality. È il segreto condiviso HMAC.
> Generare 64+ char random e condividere fuori canale (1Password / vault gruppo).

---

## N1. Migration: aggiungere `global_id` alla tabella `supplier`

```sql
-- ERP supabase migration: 0042_supplier_global_id.sql

ALTER TABLE supplier
  ADD COLUMN IF NOT EXISTS global_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS quality_last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_score int,
  ADD COLUMN IF NOT EXISTS quality_status text,
  ADD COLUMN IF NOT EXISTS quality_blocked_for_orders boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS quality_block_reasons text[];

CREATE INDEX IF NOT EXISTS idx_supplier_global_id ON supplier(global_id);
CREATE INDEX IF NOT EXISTS idx_supplier_blocked ON supplier(quality_blocked_for_orders) WHERE quality_blocked_for_orders = true;

-- Backfill: genera global_id per tutti i supplier che non ne hanno
UPDATE supplier SET global_id = gen_random_uuid() WHERE global_id IS NULL;

ALTER TABLE supplier ALTER COLUMN global_id SET NOT NULL;
```

I 5 campi `quality_*` sono uno **specchio cache** dello stato Quality, popolato dal receiver N2.
Il gate N4 può leggere da qui per blocco veloce, ma in caso di dubbio chiama sempre `quality-status` live.

---

## N2. Endpoint receiver — `POST /api/integrations/quality/inbound`

Riceve push da Quality (worker outbox). Stesso schema HMAC del lato Quality.

```ts
// app/api/integrations/quality/inbound/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const ts = req.headers.get("x-timestamp");
  const sig = req.headers.get("x-signature");
  const idem = req.headers.get("x-idempotency-key");
  const secret = process.env.QUALITY_INTEGRATION_SECRET;

  // 1. Verifiche HMAC
  if (!secret) return NextResponse.json({ error: "secret non configurato" }, { status: 500 });
  if (!ts || !sig || !idem) return NextResponse.json({ error: "headers mancanti" }, { status: 401 });
  const age = Math.abs(Date.now() / 1000 - parseInt(ts, 10));
  if (age > 300) return NextResponse.json({ error: "timestamp scaduto" }, { status: 401 });
  const expected = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  if (expected.length !== sig.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return NextResponse.json({ error: "firma non valida" }, { status: 401 });
  }

  // 2. Parse + idempotency
  const admin = createServiceRoleClient();
  const { data: dup } = await admin
    .from("quality_inbound_log")
    .select("id")
    .eq("idempotency_key", idem)
    .maybeSingle();
  if (dup) return NextResponse.json({ ok: true, deduplicated: true });

  const payload = JSON.parse(body); // { action, global_id, payload: {...} }
  const { action, global_id, payload: data } = payload;

  // 3. Routing per action
  if (action === "supplier_qualification.updated") {
    // Aggiorna specchio cache nel record supplier ERP
    await admin.from("supplier").update({
      quality_score: data.score,
      quality_status: data.qualification_status,
      quality_blocked_for_orders: data.blocked_for_orders,
      quality_block_reasons: data.block_reasons ?? [],
      quality_last_sync_at: new Date().toISOString(),
    }).eq("global_id", global_id);
  }

  if (action === "supplier_qualification.expired") {
    await admin.from("supplier").update({
      quality_blocked_for_orders: true,
      quality_block_reasons: ["Qualifica scaduta"],
      quality_last_sync_at: new Date().toISOString(),
    }).eq("global_id", global_id);
  }

  // 4. Log idempotency
  await admin.from("quality_inbound_log").insert({
    idempotency_key: idem,
    action,
    global_id,
    payload: data,
  });

  return NextResponse.json({ ok: true });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```

Migration di supporto:

```sql
CREATE TABLE IF NOT EXISTS quality_inbound_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text UNIQUE NOT NULL,
  action text NOT NULL,
  global_id uuid,
  payload jsonb,
  received_at timestamptz DEFAULT now()
);
```

---

## N3. Webhook OUT — ogni modifica supplier → notifica Quality

Helper centralizzato (riutilizzabile su create/update/delete):

```ts
// lib/integrations/quality-client.ts
import "server-only";
import { createHmac, randomUUID } from "node:crypto";

interface NotifyOpts {
  action: "supplier.created" | "supplier.updated" | "supplier.deleted";
  globalId: string;
  erpSupplierId: string;
  fields: Record<string, unknown>;
}

export async function notifyQualitySupplierChange(opts: NotifyOpts): Promise<void> {
  const url = process.env.QUALITY_INTEGRATION_URL;
  const secret = process.env.QUALITY_INTEGRATION_SECRET;
  const path = process.env.QUALITY_WEBHOOK_PATH ?? "/api/integrations/erp/webhook";

  if (!url || !secret) {
    console.warn("[Quality] integration non configurata, skip notify");
    return;
  }

  const body = JSON.stringify({
    action: opts.action,
    global_id: opts.globalId,
    erp_supplier_id: opts.erpSupplierId,
    fields: opts.fields,
  });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Timestamp": ts,
        "X-Signature": sig,
        "X-Idempotency-Key": randomUUID(),
      },
      body,
    });
    if (!res.ok) console.error(`[Quality] webhook fail HTTP ${res.status}`, await res.text());
  } catch (e) {
    console.error("[Quality] webhook exception", e);
  }
}
```

Integrazione nel flusso di update supplier (esempio):

```ts
// app/(app)/suppliers/[id]/actions.ts (ERP)
"use server";
import { notifyQualitySupplierChange } from "@/lib/integrations/quality-client";

export async function updateSupplierAction(id: string, fields: Partial<Supplier>) {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin.from("supplier").select("global_id").eq("id", id).single();
  if (!existing) throw new Error("supplier non trovato");

  await admin.from("supplier").update(fields).eq("id", id);

  // 🔔 notifica Quality
  await notifyQualitySupplierChange({
    action: "supplier.updated",
    globalId: existing.global_id,
    erpSupplierId: id,
    fields, // solo i campi cambiati
  });

  revalidatePath(`/suppliers/${id}`);
}
```

Stesso pattern su `createSupplierAction()` con `action: "supplier.created"`.

---

## N4. Gate pre-ordine — blocco se `blocked_for_orders=true`

```ts
// lib/integrations/quality-gate.ts
import "server-only";
import { createHmac } from "node:crypto";

export interface QualityStatus {
  qualification_status: string;
  score: number | null;
  blocked_for_orders: boolean;
  block_reasons: string[];
  valid_until: string | null;
  missing_documents: string[];
  last_updated_at: string;
}

export async function fetchQualityStatus(globalId: string): Promise<QualityStatus | null> {
  const url = process.env.QUALITY_INTEGRATION_URL;
  const secret = process.env.QUALITY_INTEGRATION_SECRET;
  if (!url || !secret) {
    console.warn("[Quality] integration non configurata - fail safe: BLOCCO ordine");
    return null;
  }

  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", secret).update(`${ts}.`).digest("hex");
  const endpoint = `${url.replace(/\/$/, "")}/suppliers/${globalId}/quality-status`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        "X-Timestamp": ts,
        "X-Signature": sig,
        "X-Idempotency-Key": `erp-${Date.now()}-${globalId}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("[Quality] fetch status fail", e);
    return null;
  }
}
```

Integrazione nel flusso ordine:

```ts
// app/(app)/orders/new/actions.ts (ERP)
"use server";
import { fetchQualityStatus } from "@/lib/integrations/quality-gate";

export async function createOrderAction(input: { supplierId: string; ... }) {
  const admin = createServiceRoleClient();
  const { data: sup } = await admin.from("supplier").select("global_id, name").eq("id", input.supplierId).single();
  if (!sup) throw new Error("Fornitore non trovato");

  // 🔒 GATE QUALITY
  const status = await fetchQualityStatus(sup.global_id);
  if (!status) {
    throw new Error("Stato qualità non disponibile - ordine bloccato per sicurezza");
  }
  if (status.blocked_for_orders) {
    throw new Error(
      `Ordine rifiutato: fornitore ${sup.name} bloccato in Quality (${status.block_reasons.join(", ")}). ` +
      `Apri in Quality: ${process.env.QUALITY_APP_URL}/suppliers/qualification/${sup.global_id}?source=erp`
    );
  }

  // ✅ ok, procedi con insert
  const { data: order } = await admin.from("order").insert({ ... }).select().single();
  return order;
}
```

UI dovrebbe mostrare l'errore con bottone "Apri scheda qualità" che linka direttamente.

---

## N5. UI fornitore — rimuovere vecchio modulo + deep link + iframe

### N5.1 Banner stato Quality nella scheda fornitore

```tsx
// app/(app)/suppliers/[id]/page.tsx (ERP)
import { fetchQualityStatus } from "@/lib/integrations/quality-gate";
import { QualityIframeWidget } from "@/components/quality-iframe-widget";

export default async function SupplierDetailPage({ params }) {
  const supabase = createServerClient();
  const { data: sup } = await supabase.from("supplier").select("*").eq("id", params.id).single();
  const status = await fetchQualityStatus(sup.global_id);

  const qualityDeepLink = `${process.env.QUALITY_APP_URL}/suppliers/qualification/${sup.global_id}?source=erp`;

  return (
    <div>
      {/* ❌ RIMUOVERE qui qualsiasi sezione vecchia "Qualifica fornitore" */}

      {/* ✅ Nuovo banner Quality */}
      {status?.blocked_for_orders && (
        <div className="border-2 border-red-600 bg-red-50 p-4 rounded mb-4">
          <strong>⛔ Fornitore bloccato in Quality</strong>
          <ul className="text-sm mt-2">
            {status.block_reasons.map((r, i) => <li key={i}>· {r}</li>)}
          </ul>
        </div>
      )}

      {/* Bottoni deep link */}
      <div className="flex gap-2 mb-4">
        <a href={qualityDeepLink} target="_blank" rel="noopener"
           className="px-4 py-2 bg-cyan-600 text-white rounded">
          🛡️ Apri in Quality Control Plant
        </a>
        <a href={`${process.env.QUALITY_APP_URL}/suppliers/qualification/${sup.global_id}/edit?source=erp`}
           target="_blank" rel="noopener"
           className="px-4 py-2 bg-slate-700 text-white rounded">
          Modifica qualifica
        </a>
      </div>

      {/* Widget iframe */}
      <QualityIframeWidget globalId={sup.global_id} />

      {/* Resto della scheda ERP (ordini, fatture, ecc.) */}
    </div>
  );
}
```

### N5.2 Componente iframe widget

```tsx
// components/quality-iframe-widget.tsx (ERP)
import { createHmac } from "node:crypto";

export function QualityIframeWidget({ globalId }: { globalId: string }) {
  const base = process.env.QUALITY_APP_URL;
  const secret = process.env.QUALITY_INTEGRATION_SECRET;
  if (!base || !secret) {
    return <p className="text-sm text-slate-500">Widget Quality non configurato</p>;
  }
  const ts = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", secret).update(`${globalId}.${ts}`).digest("hex");
  const src = `${base}/embed/supplier-status/${globalId}?ts=${ts}&sig=${sig}`;

  return (
    <iframe
      src={src}
      title="Stato Quality fornitore"
      style={{ width: "100%", height: 360, border: "1px solid #e5e7eb", borderRadius: 8 }}
    />
  );
}
```

### N5.3 Sidebar ERP — rimuovere voce vecchia

Nella sidebar ERP cercare la voce di menu **"Qualifica Fornitori"** (modulo vecchio) e:
- **Rimuoverla** oppure
- **Sostituirla** con link esterno: `<a href="https://quality.leonardo.../suppliers/qualification" target="_blank">🛡️ Qualità (apre Quality Control Plant)</a>`

---

## N6. Backfill one-shot — popolare global_id su tutti i supplier esistenti

```ts
// scripts/backfill-quality-sync.ts (ERP)
import { createServiceRoleClient } from "@/lib/supabase/server";
import { notifyQualitySupplierChange } from "@/lib/integrations/quality-client";

async function main() {
  const admin = createServiceRoleClient();
  const { data: suppliers } = await admin
    .from("supplier")
    .select("id, global_id, name, legal_name, tax_id, email, phone, address, country");

  for (const s of suppliers ?? []) {
    await notifyQualitySupplierChange({
      action: "supplier.created",
      globalId: s.global_id,
      erpSupplierId: s.id,
      fields: {
        legal_name: s.legal_name ?? s.name,
        tax_id: s.tax_id,
        email: s.email,
        phone: s.phone,
        address: s.address,
        country: s.country,
      },
    });
    console.log(`✓ Sync ${s.name} (${s.global_id})`);
    await new Promise(r => setTimeout(r, 50)); // throttle
  }
}

main().catch(console.error);
```

Eseguire **una sola volta** dopo migration N1:

```bash
npx tsx scripts/backfill-quality-sync.ts
```

---

## N7. Smoke test end-to-end

Procedura per verificare che la catena sia viva. Tempo stimato: 10 min.

1. **Verifica env vars ERP**: tutte 4 popolate in Vercel
2. **Verifica connettività**: dal terminale ERP
   ```bash
   curl -s https://quality.leonardo.../api/integrations/erp/status | jq
   ```
   Tutti i `*_configured=true`.

3. **Test gate pre-ordine** sulla demo bloccata:
   - In ERP, scheda supplier con `global_id=demo-erp-quality-d9ffb771`
   - Provare a creare un ordine
   - Aspettativa: errore `"Ordine rifiutato: fornitore SUP-DEMO-ERP-QUALITY-001 bloccato in Quality (Score < 60, DURC scaduto)"`

4. **Test webhook OUT**: modifica email del supplier demo dall'ERP
   - Aspettativa: in Quality, `/integrations/erp-quality` mostra una riga `inbound` nei log con `fields_updated=["email"]`

5. **Test receiver IN**: in Quality, modifica score del supplier demo da 42 a 65
   - Verifica `sync_outbox` Quality: riga `sent`
   - Verifica `quality_inbound_log` ERP: riga ricevuta
   - Verifica `supplier.quality_score` ERP: aggiornato a 65
   - Riprovare gate pre-ordine: ora deve passare (`blocked=false`)

6. **Test iframe widget**: aprire scheda supplier ERP demo
   - Aspettativa: iframe rendered con score color-coded + banner blocco

7. **Test sync_conflict**: dall'ERP, provare a forzare un POST con `fields.score=99`
   - Aspettativa: in Quality, `/integrations/erp-quality` mostra 1 conflitto non risolto

---

## 8. FAQ / Troubleshooting

**Q: Posso saltare il gate pre-ordine se Quality è down?**
A: No. Il design è **fail-closed**: se Quality non risponde → blocco ordine. Pattern banking. Eccezione: definire SLA + circuit breaker se diventa problema operativo.

**Q: Cosa succede se ERP cambia score lato suo?**
A: Quality genera `sync_conflict`, NON sovrascrive. RQ risolve manualmente in `/integrations/erp-quality`. ERP **non deve** scrivere campi qualità, mai.

**Q: Il backfill genera doppioni?**
A: No: Quality dedup via `idempotency-key`. Tuttavia su `supplier.created` se `global_id` esiste già verrà trattato come update no-op (`fields_updated=[]`).

**Q: Si può fare in modo che il widget mostri solo se bloccato?**
A: Sì, controlla `status.blocked_for_orders` e renderizza iframe condizionalmente.

**Q: Come gestisco i supplier ERP **legacy** già esistenti in Quality (senza global_id)?**
A: Vedi N6 backfill. Quality cerca per `erp_supplier_id` come fallback (vedi `webhook/route.ts` logica `or(...)`).

---

## 9. Riferimenti — lato Quality (questo repo)

- Endpoint che chiami: [/api/integrations/erp/webhook](../app/api/integrations/erp/webhook/route.ts) (POST), [/quality-status](../app/api/integrations/erp/suppliers/[globalId]/quality-status/route.ts) (GET), [/status](../app/api/integrations/erp/status/route.ts) (GET, no auth)
- HMAC: stesso schema documentato in [ERP_INTEGRATION_TEST.md sezione 1](./ERP_INTEGRATION_TEST.md#1-schema-hmac)
- Widget iframe: `/embed/supplier-status/[globalId]?ts=&sig=` — vedi [layout.tsx](../app/embed/layout.tsx)
- Console gestione: `/integrations/erp-quality` (lato Quality, accesso direzione_gruppo/RQ)
- Test suite: `/integrations/erp-quality/test`

---

## 10. Mappatura action verso Quality (push outbox)

Quando RQ aggiorna una qualifica in Quality, il worker outbox spedisce a ERP `POST /api/integrations/quality/inbound` con uno di questi `action`:

| Action | Quando | Payload chiave |
|--------|--------|----------------|
| `supplier_qualification.updated` | Cambio score/status/block | `{ score, qualification_status, blocked_for_orders, block_reasons, valid_until }` |
| `supplier_qualification.expired` | Cron daily, qualifica scaduta | `{ valid_until, missing_documents }` |
| `supplier_qualification.deleted` | Soft delete fornitore | `{ deleted_at, deleted_by }` |

Aggiungere altri `action` in `quality-inbound-log` man mano che servono. Per ora coprire i primi due basta per gate pre-ordine.
