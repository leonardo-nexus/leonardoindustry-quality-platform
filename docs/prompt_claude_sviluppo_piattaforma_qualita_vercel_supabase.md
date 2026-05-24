# Prompt operativo per Claude

Usa questo documento come istruzione principale per sviluppare la piattaforma web di gestione qualita, sicurezza, ambiente e saldatura per il gruppo Leonardoindustry.

## 1. Obiettivo

Devi costruire una piattaforma SaaS interna per gestire:

- ISO 9001, qualita;
- ISO 45001, salute e sicurezza;
- ISO 14001, ambiente;
- UNE-EN 1090-1 e UNE-EN 1090-2, controllo produzione di fabbrica, strutture metalliche e saldatura;
- WPS, WPQR, qualifiche saldatori, materiali, controlli e dossier CE;
- audit, non conformita, azioni correttive, scadenze e reminder;
- gestione multi-impresa per le 9 imprese del gruppo Leonardoindustry.

La piattaforma deve girare su:

- GitHub per repository e versionamento;
- Vercel per deploy web;
- Supabase per PostgreSQL, autenticazione, storage file e policy di sicurezza.

## 2. Stack obbligatorio

Usare:

- Next.js App Router;
- TypeScript;
- Tailwind CSS;
- shadcn/ui;
- Supabase PostgreSQL;
- Supabase Auth;
- Supabase Storage;
- Supabase Row Level Security;
- Supabase migrations;
- Vercel deployment collegato a GitHub.

Non usare backend separato nella prima versione. Usare Server Actions, Route Handlers e Supabase.

## 3. Struttura repository GitHub

Creare questa struttura:

```text
/
  app/
    dashboard/
    companies/
    processes/
    documents/
    deadlines/
    audits/
    non-conformities/
    actions/
    people/
    assets/
    welding/
    projects/
    settings/
  components/
    layout/
    tables/
    forms/
    status/
    charts/
  lib/
    supabase/
    auth/
    validators/
    permissions/
    dates/
  supabase/
    migrations/
    seed.sql
  docs/
    architettura_app_qualita_iso_une1090.md
    istruzioni_database_app_qualita_iso_une1090.md
    modello_dati_app_qualita_iso_une1090.md
  public/
  middleware.ts
  package.json
  README.md
```

## 4. File di riferimento gia preparati

Leggere e rispettare questi file:

- `architettura_app_qualita_iso_une1090.md`
- `modello_dati_app_qualita_iso_une1090.md`
- `istruzioni_database_app_qualita_iso_une1090.md`
- `schema_iniziale_database_qualita.sql`
- `backlog_mvp_app_qualita_iso_une1090.md`
- `mappa_gestione_sistema_qualita_leonardoindustry.md`
- `inventario_sistema_qualita.csv`

Usare `schema_iniziale_database_qualita.sql` come base della prima migration Supabase.

## 5. Regola fondamentale del prodotto

Nessun dato deve essere isolato.

Ogni record operativo deve collegarsi, quando applicabile, a:

- impresa;
- sede/officina/cantiere;
- processo;
- norma/requisito;
- responsabile;
- scadenza;
- evidenza/documento;
- azione correttiva, se nasce da problema, audit, incidente, saldatura non conforme o NC.

## 6. Supabase

### 6.1 Database

Usare PostgreSQL su Supabase.

Creare le tabelle tramite migrations dentro:

```text
supabase/migrations/
```

Prima migration:

```text
001_initial_quality_system.sql
```

Contenuto:

- enum;
- tabelle anagrafiche;
- norme e requisiti;
- documenti;
- task e reminder;
- audit;
- NC;
- azioni;
- persone e competenze;
- asset;
- modulo saldatura;
- dossier CE;
- indici principali.

### 6.2 Autenticazione

Usare Supabase Auth con Next.js App Router e sessioni cookie-based.

Ruoli app:

- admin_gruppo;
- direzione_gruppo;
- direzione_impresa;
- responsabile_qualita;
- responsabile_sicurezza;
- responsabile_ambiente;
- responsabile_saldatura;
- project_manager;
- capo_officina;
- capo_cantiere;
- auditor;
- operatore;
- fornitore.

La tabella `person` deve collegarsi all'utente Supabase Auth tramite `auth_user_id uuid`, da aggiungere se manca.

### 6.3 Row Level Security

Attivare RLS sulle tabelle operative.

Regole:

- admin_gruppo vede tutto;
- direzione_gruppo vede tutto in lettura e approva escalation;
- direzione_impresa vede solo la propria impresa;
- responsabili vedono e modificano solo processi assegnati;
- operatori vedono solo task e checklist assegnate;
- fornitori vedono solo i propri documenti e richieste.

Non disattivare RLS in produzione.

### 6.4 Storage

Creare bucket:

- `documents`
- `evidence`
- `welding`
- `certificates`
- `audit-reports`
- `ce-dossiers`

Regole:

- i file non devono essere pubblici di default;
- usare signed URLs per accesso file;
- ogni file caricato deve creare record in `file_attachment`;
- salvare sempre `company_id`, `original_path`, `file_name`, `mime_type`, `size_bytes`, `checksum` se possibile.

## 7. Vercel

Deploy su Vercel collegato a GitHub.

Usare ambienti:

- Development;
- Preview;
- Production.

Variabili ambiente richieste:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_REF=
DATABASE_URL=
```

Regole:

- non esporre `SUPABASE_SERVICE_ROLE_KEY` nel client;
- usare variabili `NEXT_PUBLIC_` solo per valori sicuri lato browser;
- configurare le env var in Vercel Project Settings;
- non committare `.env.local`;
- aggiungere `.env.example`.

## 8. GitHub

Branch strategy:

- `main`: produzione;
- `develop`: sviluppo integrato;
- `feature/*`: nuove funzioni;
- `fix/*`: correzioni.

Regole:

- ogni modifica passa da pull request;
- ogni PR deve includere descrizione, screenshot se UI, e note migration se database;
- migrations Supabase devono essere versionate;
- non modificare manualmente il database di produzione senza migration.

## 9. Moduli MVP da implementare

Implementare in questo ordine.

### 9.1 Login e layout

Schermate:

- login;
- recupero password;
- layout con sidebar;
- topbar con impresa selezionata;
- profilo utente.

### 9.2 Dashboard gruppo

Mostrare:

- imprese totali;
- scadenze rosse/arancioni;
- NC aperte;
- audit prossimi;
- documenti da revisionare;
- qualifiche saldatori in scadenza;
- strumenti/tarature in scadenza;
- commesse aperte.

### 9.3 Imprese e sedi

CRUD:

- imprese;
- sedi;
- officine;
- cantieri.

### 9.4 Processi e norme

CRUD:

- processi;
- norme;
- requisiti;
- collegamento processo-requisito.

### 9.5 Documenti

CRUD:

- documenti;
- revisioni;
- upload file;
- stato documento;
- collegamento a processo/norma/impresa.

Blocchi:

- non permettere uso operativo di documento obsoleto.

### 9.6 Scadenze

CRUD:

- task;
- reminder;
- stati;
- priorita;
- responsabile.

Vista:

- calendario;
- tabella scadenze;
- filtri per impresa, processo, responsabile, stato.

### 9.7 Audit, NC e azioni

CRUD:

- audit;
- checklist;
- rilievi;
- non conformita;
- azioni correttive;
- verifica efficacia.

Blocchi:

- non chiudere NC senza azione;
- non chiudere azione senza verifica efficacia.

### 9.8 Persone e competenze

CRUD:

- persone;
- ruoli;
- competenze;
- attestati;
- scadenze.

Vista:

- matrice competenze;
- scadenze formazione.

### 9.9 Asset

CRUD:

- strumenti;
- saldatrici;
- veicoli;
- attrezzature;
- estintori;
- manutenzioni;
- tarature;
- revisioni.

Blocchi:

- asset scaduto o fuori servizio non utilizzabile in saldatura/commessa.

### 9.10 Modulo saldatura / UNE-EN 1090

CRUD:

- classi EXC;
- processi saldatura;
- WPS;
- WPQR;
- qualifiche saldatori;
- materiali e certificati;
- disegni;
- saldature;
- controlli VT/CND;
- dossier CE.

Blocchi obbligatori:

- non autorizzare saldatura senza commessa;
- non autorizzare saldatura senza EXC;
- non autorizzare saldatura senza disegno approvato;
- non autorizzare saldatura senza WPS valida;
- non autorizzare saldatura senza WPQR collegata;
- non autorizzare saldatura con saldatore non qualificato o qualifica scaduta;
- non chiudere saldatura senza controllo VT;
- non chiudere saldatura con CND richiesto ma non eseguito;
- non chiudere dossier CE con NC aperte.

## 10. UI e UX

Stile:

- professionale;
- operativo;
- dashboard chiara;
- niente landing page;
- prima schermata dopo login = dashboard.

Componenti:

- sidebar con moduli;
- tabelle con filtri;
- badge stato;
- card sintetiche solo per KPI;
- form puliti;
- drawer o modal per creazione rapida;
- upload file con stato;
- timeline per NC/azioni;
- alert visivi per scadenze.

Colori stato:

- verde = conforme/completato;
- blu = pianificato;
- giallo = entro 30 giorni;
- arancione = entro 7 giorni;
- rosso = scaduto/non conforme;
- nero = blocco operativo grave.

## 11. Regole tecniche

Usare:

- Zod per validazione form;
- React Hook Form;
- TanStack Table o equivalente per tabelle;
- Server Components dove utile;
- Server Actions per mutazioni semplici;
- Route Handlers per upload o funzioni complesse;
- Supabase client server-side per dati protetti.

Non fare:

- non usare chiavi service role lato client;
- non mettere logica di sicurezza solo nel frontend;
- non lasciare bucket pubblici senza motivo;
- non saltare RLS;
- non creare tabelle senza `company_id` quando il dato e multi-impresa;
- non creare funzioni senza gestione errori.

## 12. Seed iniziale

Creare `supabase/seed.sql` con:

- gruppo Leonardoindustry;
- 9 imprese placeholder, se non sono ancora noti i nomi;
- ruoli;
- processi master;
- norme;
- classi EXC;
- processi saldatura 111, 135, 136, 141.

Nomi imprese placeholder:

- Impresa 1
- Impresa 2
- Impresa 3
- Impresa 4
- Impresa 5
- Impresa 6
- Impresa 7
- Impresa 8
- Impresa 9

## 13. Output richiesto da Claude

Claude deve produrre:

1. repository Next.js pronto;
2. schema Supabase migration;
3. seed iniziale;
4. layout app;
5. dashboard;
6. CRUD MVP principali;
7. RLS policies iniziali;
8. README con istruzioni:
   - installazione locale;
   - configurazione Supabase;
   - configurazione Vercel;
   - variabili ambiente;
   - comandi migration;
   - comandi deploy.

## 14. Comandi attesi

Nel README includere comandi simili:

```bash
npm install
npm run dev
supabase login
supabase link --project-ref PROJECT_REF
supabase db push
supabase db reset
```

## 15. Fonti tecniche da rispettare

Usare documentazione ufficiale:

- Supabase Auth con Next.js App Router;
- Supabase CLI migrations;
- Supabase Storage;
- Vercel environment variables;
- Next.js environment variables.

## 16. Criteri di accettazione MVP

Il lavoro e accettabile solo se:

- login funziona;
- un utente vede solo dati autorizzati;
- dashboard mostra dati reali da Supabase;
- documenti si possono caricare e collegare a processo;
- scadenze generano stati;
- audit, NC e azioni sono collegati;
- una NC non si chiude senza azione;
- una saldatura non si autorizza senza WPS valida e saldatore valido;
- file allegati sono salvati in Supabase Storage;
- progetto si deploya su Vercel da GitHub;
- README permette a un altro sviluppatore di avviare tutto.

