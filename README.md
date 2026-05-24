# Leonardoindustry Quality Platform

Piattaforma integrata di gestione qualità, sicurezza, ambiente e saldatura del gruppo Leonardoindustry (9 imprese).

**Norme coperte:** ISO 9001 · ISO 45001 · ISO 14001 · UNE-EN 1090-1/-2 · ISO 3834 · ISO 9606 · ISO 15614 · ISO 15609.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Postgres + Auth + Storage + RLS) · Vercel · GitHub.

---

## Frase guida

> La piattaforma deve trasformare il sistema qualità da archivio documentale a sistema operativo di controllo, prevenzione e miglioramento continuo per tutte le imprese del gruppo Leonardoindustry.

---

## Setup rapido (locale)

### 1. Prerequisiti
- Node.js >= 18.18
- npm (incluso in Node)
- Account Supabase (https://supabase.com)
- Git
- Account Vercel (https://vercel.com) — opzionale per il deploy

### 2. Installazione
```bash
npm install
cp .env.example .env.local
```

Compila `.env.local` con i dati del progetto Supabase (vedi sezione seguente).

### 3. Creazione progetto Supabase
1. Vai su https://supabase.com/dashboard → **New project**.
2. Regione: **Europe (West) Frankfurt** o **South America** in base ai dati.
3. Salva: Project URL, anon key, service role key, database password.
4. Aggiungi le chiavi a `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role>
   SUPABASE_PROJECT_REF=<ref>
   DATABASE_URL=postgresql://postgres.<ref>:<pwd>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
   ```

### 4. Migrations e seed
Le migrations sono in `supabase/migrations/`. Applica con la Supabase CLI (via `npx`):
```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```
Il seed (`supabase/seed.sql`) carica: gruppo Leonardoindustry, 9 imprese placeholder, 13 ruoli, 18 processi master, 9 norme, 4 classi EXC, 10 processi saldatura ISO 4063, 30 competenze. Eseguilo nello SQL editor di Supabase oppure:
```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

### 5. Storage buckets
La migration `003_storage_buckets.sql` crea automaticamente i 6 bucket privati. Verifica nello Storage UI:
- `documents` · `evidence` · `welding` · `certificates` · `audit-reports` · `ce-dossiers`

### 6. Primo utente
1. In Supabase **Authentication → Users → Add user** (email + password).
2. In **SQL editor**, collega l'utente a una persona del gruppo come `admin_gruppo`:
   ```sql
   insert into person (company_id, role_id, auth_user_id, first_name, last_name, email)
   values (
     (select id from company where name = 'Impresa 1' limit 1),
     (select id from role where code = 'admin_gruppo'),
     '<UUID-AUTH-USER>',
     'Nome',
     'Cognome',
     'email@leonardoindustry.com'
   );
   ```
3. (Disattiva eventualmente sign-up pubblico in `supabase/config.toml` → `enable_signup = false`.)

### 7. Avvio sviluppo
```bash
npm run dev
```
Apri http://localhost:3000 → login → dashboard.

---

## Setup GitHub

```bash
git init
git add .
git commit -m "feat: initial platform scaffold"
git branch -M main
git remote add origin git@github.com:<org>/leonardoindustry-quality-platform.git
git push -u origin main
git checkout -b develop && git push -u origin develop
```

**Branch strategy:** `main` (prod, protetto) ← `develop` (integrazione) ← `feature/*` / `fix/*` (PR).

Ogni PR deve includere:
- descrizione (cosa cambia, perché)
- screenshot se UI
- note migration se database

---

## Setup Vercel

1. **Add new project** → import del repo GitHub.
2. Framework: Next.js (auto-detect).
3. Production branch: `main`.
4. Environment variables: replica `.env.local` su tutti gli ambienti (Production, Preview, Development).
5. **IMPORTANTE:** `SUPABASE_SERVICE_ROLE_KEY` deve restare **senza** prefisso `NEXT_PUBLIC_` — è solo server-side.

Idealmente: due progetti Supabase separati (staging + production) con Vercel che usa env diverse per Preview vs Production.

---

## Architettura logica

```
Gruppo Leonardoindustry
  └─ 9 imprese
      └─ Sedi / Officine / Cantieri / Magazzini
          ├─ Processi (qualità, sicurezza, ambiente, saldatura...)
          ├─ Documenti (procedure, registri, WPS, WPQR...)
          ├─ Persone + Competenze
          ├─ Asset (strumenti, saldatrici, veicoli...)
          ├─ Commesse + Disegni
          │   └─ Saldature → Controlli VT/CND → Dossier CE
          ├─ Audit → NC → Azioni → Verifica efficacia
          └─ Task / Scadenze / Reminder
```

Ogni record operativo è collegato a: impresa, processo, norma, responsabile, scadenza, evidenza, azione (se NC).

---

## Regole di blocco non negoziabili

Implementate come trigger PostgreSQL (`supabase/migrations/001_*.sql`):

| Regola | Implementazione |
|---|---|
| NC non chiudibile senza azione efficace | `enforce_nc_closure()` |
| Azione non chiudibile senza verifica efficacia | `enforce_action_closure()` |
| Saldatura non autorizzabile senza commessa + EXC + disegno approvato + WPS valida + WPQR collegata + saldatore qualificato non scaduto + materiale valido | `enforce_weld_authorization()` |
| Saldatura non chiudibile senza VT conforme (+ CND se richiesto) | `enforce_weld_authorization()` |
| Dossier CE non chiudibile con NC aperte | `enforce_dossier_closure()` |
| Documento obsoleto non utilizzabile operativamente | filtro stato `obsoleto` lato app |
| Asset scaduto/fuori_servizio non utilizzabile in commessa | filtro `status` + `next_due_date` |

---

## Comandi utili

```bash
npm run dev              # dev server :3000
npm run build            # build production
npm run start            # serve build
npm run lint             # eslint
npm run typecheck        # tsc --noEmit
npm run db:link          # link a progetto Supabase
npm run db:push          # applica migrations
npm run db:reset         # reset DB locale + seed
npm run db:diff          # diff schema locale vs prod
npm run db:types         # genera lib/supabase/database.types.ts
```

---

## Struttura repository

```
app/
  (auth)/       login, recupero password
  (app)/        layout autenticato + tutti i moduli
    dashboard/
    companies/
    processes/
    standards/
    documents/
    deadlines/
    audits/
    non-conformities/
    actions/
    people/
    assets/
    projects/
    welding/    wps, wpqr, welders, materials, welds
    settings/
  auth/callback/  OAuth callback
components/
  ui/           shadcn/ui primitives
  layout/       sidebar, topbar, page-header
  status/       deadline badge
lib/
  supabase/     server.ts, client.ts, middleware.ts
  auth/         session, roles
  dates/        deadline classification + colors
  validators/   zod schemas comuni
supabase/
  migrations/   001 schema, 002 RLS, 003 storage
  seed.sql
  config.toml
docs/           materiale sorgente di progetto
middleware.ts   refresh sessione + redirect
```

---

## Ruoli e permessi (RLS)

| Ruolo | Letture | Scritture |
|---|---|---|
| `admin_gruppo` | tutto | tutto |
| `direzione_gruppo` | tutto | propria impresa |
| `direzione_impresa` | propria impresa | propria impresa |
| `responsabile_*` | propria impresa | processi assegnati |
| `project_manager` | propria impresa | commesse |
| `capo_officina/cantiere` | propria impresa | esecuzione sede |
| `auditor` | tutto in lettura | audit assegnati |
| `operatore` | proprie task | proprie task |
| `fornitore` | propri documenti | propri documenti |

---

## Criteri di accettazione MVP

- [x] Login funzionante
- [x] Utente vede solo dati autorizzati (RLS)
- [x] Dashboard mostra KPI reali da Supabase
- [x] Documenti caricabili e collegati a processo
- [x] Scadenze generano stati visivi (verde/blu/giallo/arancione/rosso/nero)
- [x] Audit → NC → Azioni → verifica efficacia (catena obbligatoria)
- [x] NC non chiudibile senza azione efficace
- [x] Saldatura non autorizzabile senza catena completa (DB trigger)
- [x] File allegati su Supabase Storage (bucket privati + signed URLs)
- [x] Deploy su Vercel da GitHub

---

## Documentazione di riferimento

I documenti di progetto originali sono in `docs/`:
- `architettura_app_qualita_iso_une1090.md`
- `modello_dati_app_qualita_iso_une1090.md`
- `istruzioni_database_app_qualita_iso_une1090.md`
- `backlog_mvp_app_qualita_iso_une1090.md`
- `mappa_gestione_sistema_qualita_leonardoindustry.md`
- `inventario_sistema_qualita.csv`
- `preambolo_app_qualita_leonardoindustry.md`
- `prompt_claude_sviluppo_piattaforma_qualita_vercel_supabase.md`
- `setup_github_vercel_supabase.md`

---

## Documentazione tecnica esterna

- [Supabase Auth con Next.js App Router](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Supabase CLI migrations](https://supabase.com/docs/reference/cli/supabase-migration-fetch)
- [Vercel environment variables](https://vercel.com/docs/projects/environment-variables)
- [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables)
