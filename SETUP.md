# Guida setup passo-passo

Questa guida è per chi deve creare l'infrastruttura GitHub + Supabase + Vercel da zero.

---

## Passo 1 — Repository GitHub

1. Vai su [github.com/new](https://github.com/new).
2. Nome: `leonardoindustry-quality-platform`
3. Visibilità: **Private** (consigliato).
4. Non inizializzare con README, .gitignore o license — li abbiamo già nel progetto.
5. Da terminale, nella cartella del progetto:
   ```bash
   git init
   git add .
   git commit -m "feat: initial platform scaffold"
   git branch -M main
   git remote add origin git@github.com:<TUO-USER>/leonardoindustry-quality-platform.git
   git push -u origin main
   git checkout -b develop
   git push -u origin develop
   ```
6. Su GitHub → **Settings** → **Branches** → proteggi `main`:
   - Require pull request before merging
   - Require approvals: 1
   - Do not allow bypassing

---

## Passo 2 — Progetto Supabase

1. Vai su [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Compila:
   - Name: `leonardoindustry-quality`
   - Database password: **salvala in un password manager**
   - Region: **West EU (Frankfurt)** o vicina alla sede operativa
   - Pricing plan: Free per sviluppo, Pro per produzione
3. Attendi 1–2 minuti di provisioning.
4. **Settings → API** — copia in `.env.local`:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ segreta)
   - Project ref (parte iniziale del URL) → `SUPABASE_PROJECT_REF`
5. **Settings → Database → Connection string → URI** → `DATABASE_URL`

### Applicazione dello schema

Opzione A — Supabase CLI (consigliata):
```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```

Opzione B — SQL Editor manuale:
1. Apri **SQL Editor** in Supabase.
2. Esegui in ordine il contenuto di:
   - `supabase/migrations/20260524000001_initial_quality_system.sql`
   - `supabase/migrations/20260524000002_rls_policies.sql`
   - `supabase/migrations/20260524000003_storage_buckets.sql`
3. Esegui `supabase/seed.sql` per popolare anagrafiche di base.

### Verifica bucket storage

In **Storage** → dovresti vedere 6 bucket privati: `documents`, `evidence`, `welding`, `certificates`, `audit-reports`, `ce-dossiers`. Tutti **non pubblici**.

### Primo utente amministratore

1. **Authentication → Users → Add user** (Add user / Create new user):
   - Email: la tua
   - Password: scegline una robusta
   - Conferma utente subito (skip email confirmation)
2. Copia l'`UUID` dell'utente.
3. **SQL Editor** — esegui:
   ```sql
   insert into person (company_id, role_id, auth_user_id, first_name, last_name, email)
   values (
     (select id from company where name = 'Impresa 1' limit 1),
     (select id from role where code = 'admin_gruppo'),
     '<UUID-DELL-UTENTE>',
     'Christian',
     'Capuano',
     'christian@leonardoindustry.com'
   );
   ```

---

## Passo 3 — Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**.
2. Seleziona `leonardoindustry-quality-platform`.
3. Framework: Next.js (auto).
4. Production branch: `main`.
5. **Environment Variables** → aggiungi le 5 variabili di `.env.local` (vedi `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Production + Preview, mai esporre)
   - `SUPABASE_PROJECT_REF`
   - `DATABASE_URL`
6. **Deploy**.

### Ambienti consigliati

| Ambiente | Branch | Supabase consigliato |
|---|---|---|
| Production | `main` | Progetto Supabase production |
| Preview | qualsiasi PR | Progetto Supabase staging |
| Development | locale | Supabase staging o locale |

Per separare staging da production crea un secondo progetto Supabase (`leonardoindustry-quality-staging`) e usa env diverse sui due ambienti Vercel.

---

## Passo 4 — Test del flusso

1. Apri l'URL Vercel del deploy.
2. Login con l'utente creato al Passo 2.
3. Dashboard dovrebbe mostrare KPI a zero ma senza errori.
4. Vai su **Imprese** → vedi le 9 imprese seed.
5. Vai su **Norme** → vedi ISO 9001 / 45001 / 14001 / UNE-EN 1090.
6. Crea un primo documento, una persona, una commessa di test.

---

## Troubleshooting

**Errore "row-level security policy violation"**
→ L'utente loggato non è collegato a una `person` con `auth_user_id`. Esegui la query SQL del Passo 2.

**Errore "permission denied for table"**
→ RLS attiva senza policy match. Verifica il `role.code` della persona.

**Upload file fallisce**
→ Controlla che i bucket esistano e che il path inizi con `<company_id>/`.

**Saldatura non autorizzabile**
→ È un comportamento atteso se manca uno qualunque tra: commessa aperta, EXC, disegno approvato, WPS valida, WPQR valida, saldatore qualificato non scaduto, materiale non bloccato. L'errore PostgreSQL ti dice cosa manca.

---

## Backup e sicurezza

- Supabase Pro fa backup giornalieri automatici.
- Free tier: esporta periodicamente lo schema e i dati critici via SQL editor.
- `SUPABASE_SERVICE_ROLE_KEY` non deve mai apparire nel browser — solo Server Components / Server Actions / Route Handlers.
- I bucket sono privati: i file si accedono solo via signed URLs generate server-side.
