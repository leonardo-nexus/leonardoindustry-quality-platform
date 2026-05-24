# Prompt Claude - Popolamento, automazioni, format compilabili e procedure operative

## 1. Situazione attuale

La piattaforma Leonardo Quality e gia avviata con:

- dashboard gruppo;
- processi aziendali;
- norme e requisiti;
- documenti;
- scadenze e task;
- audit;
- non conformita;
- azioni correttive;
- persone e competenze;
- asset;
- commesse;
- modulo UNE-EN 1090 / saldatura.

Ora il lavoro non e creare altre pagine vuote. Il lavoro e riempire, collegare, automatizzare e rendere compilabile il sistema.

La piattaforma deve diventare uno strumento operativo quotidiano.

Leggere prima anche:

- `manifesto_funzione_piattaforma_qualita.md`
- `specifica_quality_sentinel.md`
- `prompt_claude_quality_sentinel.md`

Questo file definisce il comportamento atteso della piattaforma: non archivio documentale, ma coach operativo obbligato, memoria aziendale, sistema di allarmi, verifiche e blocchi.

Priorita assoluta: implementare il modulo **Quality Sentinel** come Quality Control Operating System. Se il modulo qualita non obbliga gli operatori a seguire il processo, non e qualita: e solo archivio documentale.

## 2. Obiettivo di questa fase

Implementare:

1. dati iniziali reali o semi-reali;
2. importazione guidata dal vecchio archivio qualita;
3. format compilabili digitali;
4. collegamento tra procedure, processi, norme e moduli;
5. istruzioni operative dentro ogni processo;
6. automazioni per scadenze, allarmi, blocchi e azioni;
7. workflow completi per ISO 9001, ISO 45001, ISO 14001 e UNE-EN 1090.

## 3. Principio fondamentale

Ogni procedura deve diventare una catena operativa digitale.

Non basta caricare il PDF o il Word.

Per ogni procedura servono:

- processo collegato;
- norma/requisito collegato;
- responsabile;
- format compilabili;
- evidenze richieste;
- scadenze automatiche;
- allarmi;
- eventuali blocchi operativi;
- istruzioni operative brevi;
- output finale.

Esempio:

```text
P-10 Audit interno
→ Processo Audit
→ Requisiti ISO 9001 / 14001 / 45001 / UNE-EN 1090
→ Piano audit
→ Checklist audit
→ Rapporto audit
→ NC se presenti
→ Azioni correttive
→ Verifica efficacia
→ Riesame direzione
```

## 4. Primo lavoro: riempire il sistema

### 4.1 Processi

I processi sono gia presenti. Aggiungere per ogni processo:

- descrizione operativa;
- input;
- output;
- responsabile tipo;
- procedure collegate;
- norme collegate;
- format collegati;
- indicatori;
- rischi tipici;
- automazioni.

Esempio per `PROC-SAL-01`:

```text
Nome: UNE-EN 1090 e saldatura
Input: commessa, disegno approvato, EXC, materiali, WPS, WPQR, saldatore qualificato
Output: saldature accettate, controlli VT/CND, dossier CE
Procedure: P-21, P-22, P-23, P-24, P-15
Norme: UNE-EN 1090-1, UNE-EN 1090-2, ISO 3834-2, ISO 9606-1, ISO 15614-1, ISO 15609-1
Automazioni: blocco saldatura se WPS/WPQR/qualifica/materiale non valido
```

### 4.2 Norme e requisiti

La pagina norme ora mostra norme ma non requisiti. Caricare requisiti iniziali minimi.

Non serve inserire tutta la norma parola per parola. Serve creare requisiti operativi sintetici.

Caricare almeno:

#### ISO 9001

- 4.1 Contesto organizzazione
- 4.2 Parti interessate
- 5.2 Politica qualita
- 6.1 Rischi e opportunita
- 6.2 Obiettivi qualita
- 7.1 Risorse
- 7.2 Competenza
- 7.5 Informazione documentata
- 8.4 Fornitori esterni
- 8.5 Produzione ed erogazione servizio
- 8.6 Rilascio prodotti/servizi
- 8.7 Output non conformi
- 9.1 Monitoraggio e misurazione
- 9.2 Audit interno
- 9.3 Riesame direzione
- 10.2 Non conformita e azioni correttive

#### ISO 45001

- 5.4 Consultazione e partecipazione lavoratori
- 6.1 Rischi e opportunita SSL
- 7.2 Competenza
- 7.3 Consapevolezza
- 8.1 Controllo operativo
- 8.2 Preparazione e risposta emergenze
- 9.1 Monitoraggio SSL
- 10.2 Incidenti, NC e azioni correttive

#### ISO 14001

- 6.1 Aspetti ambientali
- 6.1 Obblighi di conformita
- 6.2 Obiettivi ambientali
- 7.2 Competenza
- 7.4 Comunicazione
- 7.5 Informazione documentata
- 8.1 Controllo operativo
- 8.2 Emergenze ambientali
- 9.1 Monitoraggio ambientale
- 10.2 NC e azioni correttive

#### UNE-EN 1090

- FPC controllo produzione di fabbrica
- classe di esecuzione EXC
- materiali e tracciabilita
- disegni e revisioni
- qualifiche saldatura
- WPS/WPQR
- qualifiche saldatori
- controlli dimensionali
- controlli saldatura VT/CND
- gestione NC tecniche
- dossier CE e dichiarazione prestazione

## 5. Secondo lavoro: creare format compilabili

Ogni format deve essere una schermata/modulo digitale con:

- codice format;
- titolo;
- processo collegato;
- procedura collegata;
- impresa;
- responsabile;
- data;
- stato;
- campi compilabili;
- allegati;
- firma/approvazione;
- generazione task se serve;
- esportazione PDF futura.

## 6. Format prioritari da creare

### 6.1 Documentazione

Format:

- `FMT-DOC-01 Registro documenti`
- `FMT-DOC-02 Richiesta nuova revisione`
- `FMT-DOC-03 Distribuzione documento`
- `FMT-DOC-04 Elenco documenti obsoleti`

Campi minimi:

- codice documento;
- titolo;
- tipo;
- revisione;
- data emissione;
- data prossima revisione;
- processo;
- norma;
- impresa;
- stato;
- approvatore;
- file allegato.

Automazioni:

- creare task revisione documento 30 giorni prima della scadenza;
- impedire uso di documento obsoleto;
- avviso se esistono due revisioni attive dello stesso documento.

### 6.2 Rischi e opportunita

Format:

- `FMT-RIS-01 Matrice rischi e opportunita`
- `FMT-RIS-02 DAFO`
- `FMT-RIS-03 Parti interessate`

Campi matrice rischi:

- area;
- processo;
- rischio/opportunita;
- causa;
- conseguenza;
- probabilita;
- gravita;
- livello rischio;
- azione consigliata;
- responsabile;
- scadenza;
- stato.

Automazioni:

- revisione annuale;
- se rischio alto, creare azione obbligatoria;
- portare rischi al riesame direzione.

### 6.3 Clienti e contratti

Format:

- `FMT-CLI-01 Verifica requisiti cliente`
- `FMT-CLI-02 Riesame offerta/contratto`
- `FMT-CLI-03 Modifica contrattuale`
- `FMT-CLI-04 Soddisfazione cliente`

Campi:

- cliente;
- commessa;
- requisiti tecnici;
- requisiti qualita;
- requisiti sicurezza;
- requisiti ambiente;
- requisiti saldatura/1090;
- documenti cliente;
- accettazione;
- note;
- responsabile.

Automazioni:

- non aprire commessa senza verifica requisiti;
- inviare questionario soddisfazione a fine commessa;
- generare NC da reclamo cliente.

### 6.4 Fornitori e subappalti

Format:

- `FMT-FOR-01 Qualifica fornitore`
- `FMT-FOR-02 Documenti obbligatori subappaltatore`
- `FMT-FOR-03 Valutazione annuale fornitore`
- `FMT-FOR-04 NC fornitore`

Campi:

- fornitore;
- tipo;
- documenti richiesti;
- scadenze documenti;
- valutazione;
- NC ricevute;
- stato qualifica;
- autorizzazione accesso cantiere.

Automazioni:

- blocco fornitore se documenti scaduti;
- rivalutazione annuale;
- allarme 30/7/1 giorni prima scadenza documenti.

### 6.5 Risorse umane e formazione

Format:

- `FMT-HR-01 Scheda persona`
- `FMT-HR-02 Matrice competenze`
- `FMT-HR-03 Piano formazione`
- `FMT-HR-04 Registro formazione`
- `FMT-HR-05 Abilitazioni e qualifiche`

Campi:

- persona;
- impresa;
- ruolo;
- mansione;
- competenza;
- attestato;
- data rilascio;
- scadenza;
- stato;
- allegato.

Automazioni:

- scadenza formazione;
- blocco assegnazione se competenza scaduta;
- alert qualifiche saldatori entro 30 giorni.

### 6.6 Commesse e cantieri

Format:

- `FMT-COM-01 Apertura commessa`
- `FMT-COM-02 Piano qualita commessa`
- `FMT-COM-03 Checklist apertura cantiere`
- `FMT-COM-04 Piano controlli ITP/PPI`
- `FMT-COM-05 Chiusura commessa`
- `FMT-COM-06 Dossier finale`

Campi apertura commessa:

- codice commessa;
- cliente;
- impresa;
- sede/cantiere;
- project manager;
- norme applicabili;
- EXC se 1090;
- procedure applicabili;
- fornitori;
- personale;
- strumenti;
- rischi specifici;
- stato.

Automazioni:

- non chiudere commessa senza dossier;
- se EXC presente, attivare modulo saldatura/1090;
- creare checklist documenti obbligatori.

### 6.7 Asset, strumenti e attrezzature

Format:

- `FMT-AST-01 Scheda asset`
- `FMT-AST-02 Registro tarature`
- `FMT-AST-03 Registro manutenzioni`
- `FMT-AST-04 Verifica saldatrice`
- `FMT-AST-05 Registro estintori`
- `FMT-AST-06 Registro veicoli`

Campi:

- codice;
- tipo;
- marca/modello;
- seriale;
- impresa;
- sede;
- stato;
- ultima verifica;
- prossima verifica;
- allegato certificato.

Automazioni:

- task taratura/manutenzione;
- asset fuori servizio non selezionabile;
- strumento scaduto non utilizzabile in controllo.

### 6.8 Audit

Format:

- `FMT-AUD-01 Piano audit annuale`
- `FMT-AUD-02 Programma audit`
- `FMT-AUD-03 Checklist audit`
- `FMT-AUD-04 Rapporto audit`
- `FMT-AUD-05 Follow-up audit`

Campi checklist:

- norma;
- clausola;
- processo;
- domanda;
- evidenza attesa;
- esito;
- rilievo;
- NC collegata;
- auditor.

Automazioni:

- creare task audit annuale;
- se esito non conforme, creare NC;
- se osservazione, creare azione miglioramento;
- reminder audit 60/30/7 giorni.

### 6.9 Non conformita

Format:

- `FMT-NC-01 Apertura NC`
- `FMT-NC-02 Analisi causa`
- `FMT-NC-03 Trattamento immediato`
- `FMT-NC-04 Azione correttiva`
- `FMT-NC-05 Verifica efficacia`

Campi:

- codice NC;
- origine;
- impresa;
- processo;
- norma;
- descrizione;
- gravita;
- causa;
- correzione immediata;
- azione correttiva;
- responsabile;
- scadenza;
- verifica efficacia;
- stato.

Automazioni:

- NC non chiudibile senza azione;
- azione non chiudibile senza verifica efficacia;
- se azione non efficace, riaprire NC o creare nuova azione;
- escalation se scaduta.

### 6.10 Ambiente

Format:

- `FMT-AMB-01 Aspetti ambientali`
- `FMT-AMB-02 Registro consumi`
- `FMT-AMB-03 Registro rifiuti`
- `FMT-AMB-04 Emergenza ambientale`
- `FMT-AMB-05 Verifica controllo operativo ambientale`

Campi:

- aspetto;
- impatto;
- condizione normale/anomala/emergenza;
- significativita;
- controllo operativo;
- consumo;
- periodo;
- soglia;
- responsabile.

Automazioni:

- aggiornamento mensile consumi;
- alert superamento soglie;
- revisione annuale aspetti ambientali.

### 6.11 Sicurezza e incidenti

Format:

- `FMT-SIC-01 Valutazione rischio operativo`
- `FMT-SIC-02 Ispezione sicurezza`
- `FMT-SIC-03 Registro DPI`
- `FMT-SIC-04 Piano emergenza`
- `FMT-INC-01 Segnalazione incidente/quasi incidente`
- `FMT-INC-02 Indagine incidente`

Automazioni:

- incidente genera indagine obbligatoria;
- incidente grave genera NC e azione;
- reminder prove emergenza;
- formazione obbligatoria se rischio collegato.

### 6.12 Saldatura / UNE-EN 1090

Format:

- `FMT-SAL-01 Scheda WPS`
- `FMT-SAL-02 Scheda WPQR`
- `FMT-SAL-03 Qualifica saldatore`
- `FMT-SAL-04 Registro materiali`
- `FMT-SAL-05 Certificato materiale 3.1`
- `FMT-SAL-06 Registro saldature`
- `FMT-SAL-07 Controllo visivo VT`
- `FMT-SAL-08 Controllo CND`
- `FMT-SAL-09 Riparazione saldatura`
- `FMT-SAL-10 Dossier CE`

Campi registro saldature:

- commessa;
- disegno;
- revisione disegno;
- numero saldatura;
- EXC;
- materiale;
- certificato materiale;
- WPS;
- WPQR;
- saldatore;
- saldatrice;
- data;
- controllo VT;
- CND richiesto;
- esito;
- NC collegata;
- stato.

Automazioni/blocchi:

- bloccare saldatura senza commessa;
- bloccare saldatura senza EXC;
- bloccare saldatura senza disegno approvato;
- bloccare saldatura senza materiale/certificato;
- bloccare saldatura senza WPS valida;
- bloccare saldatura senza WPQR;
- bloccare saldatura se saldatore scaduto;
- bloccare chiusura senza VT;
- bloccare chiusura se CND richiesto ma mancante;
- bloccare dossier CE con NC aperte.

## 7. Collegamento procedure operative

Creare tabella o configurazione `procedure_map`.

Campi:

- codice procedura;
- titolo;
- processo;
- norme collegate;
- format collegati;
- input;
- output;
- frequenza;
- responsabile;
- automazioni;
- blocchi.

Mappare almeno:

| Procedura | Processo | Format principali |
|---|---|---|
| P-01 Informazione documentata | Documentazione | FMT-DOC-01/02/03/04 |
| P-02 Rischi e opportunita | Rischi | FMT-RIS-01/02/03 |
| P-03 Fornitori esterni | Fornitori | FMT-FOR-01/03/04 |
| P-03.1 Subappalti | Fornitori | FMT-FOR-02 |
| P-04 Risorse umane | HR | FMT-HR-01/02/03/04/05 |
| P-05 Clienti | Clienti | FMT-CLI-01/02/03/04 |
| P-06 Pianificazione opere | Commesse | FMT-COM-01/02/03/04/05 |
| P-07 NC e AC | NC e azioni | FMT-NC-01/02/03/04/05 |
| P-08 Infrastruttura | Asset | FMT-AST-01/02/03 |
| P-09 Aspetti ambientali | Ambiente | FMT-AMB-01 |
| P-10 Audit interno | Audit | FMT-AUD-01/02/03/04/05 |
| P-11 Emergenze | Emergenze | FMT-SIC-04 / FMT-AMB-04 |
| P-12 Controllo operativo | Ambiente/operativo | FMT-AMB-05 |
| P-13 Antincendio | Emergenze/asset | FMT-AST-05 |
| P-14 Incidenti | Incidenti | FMT-INC-01/02 |
| P-15 Strumenti misura | Asset/saldatura | FMT-AST-02 / FMT-SAL controlli |
| P-16 Resistenza e continuita | Controlli operativi | PPI digitale |
| P-17 Tendido cavi | Controlli operativi | PPI digitale |
| P-18 Connessioni cavi | Controlli operativi | PPI digitale |
| P-19 Hincado | Controlli operativi | Checklist operativa |
| P-20 Cerramiento | Controlli operativi | Checklist operativa |
| P-21 Taller | UNE-EN 1090 | FMT-SAL / dossier |
| P-22 Strutture metalliche | UNE-EN 1090 | FMT-SAL / controlli dimensionali |
| P-23 Saldatura elettrodo | Saldatura | FMT-SAL-01/03/06/07 |
| P-24 Saldatura filo | Saldatura | FMT-SAL-01/03/06/07 |
| P-25 Design | Progettazione/commesse | FMT-COM / disegni |

## 8. Istruzioni operative dentro l'app

Ogni processo deve avere una scheda "Istruzioni operative" con:

- cosa fare;
- quando farlo;
- chi lo fa;
- quale format compilare;
- quali evidenze allegare;
- quale procedura leggere;
- quali allarmi vengono generati;
- quali blocchi possono impedire la chiusura.

Esempio per Non conformita:

```text
Quando aprire:
- audit non conforme;
- reclamo cliente;
- problema fornitore;
- difetto saldatura;
- incidente;
- documento errato;
- controllo non superato.

Cosa compilare:
- FMT-NC-01 apertura NC;
- FMT-NC-02 analisi causa;
- FMT-NC-04 azione correttiva;
- FMT-NC-05 verifica efficacia.

Regole:
- non chiudere senza azione;
- non chiudere senza verifica efficacia;
- se scaduta, escalation.
```

## 9. Automazioni da implementare subito

### 9.1 Automazioni documenti

- Alla creazione documento attivo, creare scadenza revisione.
- 30 giorni prima revisione, creare task.
- Documento obsoleto non selezionabile nei format operativi.

### 9.2 Automazioni task

- Aggiornare stato task in `scaduta` se `due_date < oggi` e non chiusa.
- Creare reminder 30/7/1 giorni.
- Mostrare task scaduti in dashboard.

### 9.3 Automazioni audit

- Audit pianificato genera reminder 60/30/7 giorni.
- Rilievo non conforme genera NC.
- Audit chiuso con NC aperte resta visibile come criticita.

### 9.4 Automazioni NC

- NC aperta genera task analisi causa.
- Azione correttiva genera task.
- Azione scaduta genera escalation.
- Chiusura NC consentita solo se azioni efficaci.

### 9.5 Automazioni formazione

- Competenza con scadenza genera task rinnovo.
- Persona con competenza scaduta non assegnabile a lavori critici.
- Saldatore con qualifica scaduta non selezionabile per saldatura.

### 9.6 Automazioni asset

- Asset con taratura/manutenzione in scadenza genera task.
- Asset scaduto o fuori servizio non selezionabile in controlli/saldatura.

### 9.7 Automazioni saldatura

- Prima di autorizzare saldatura controllare WPS, WPQR, saldatore, materiale, disegno, EXC.
- Se manca un elemento, creare blocco operativo.
- Dopo saldatura, creare task VT.
- Se CND richiesto, creare task CND.
- Se controllo non conforme, creare NC tecnica.

## 10. UI richiesta

Aggiungere in ogni pagina:

- pulsante "Importa";
- pulsante "Nuovo format";
- filtri per impresa, processo, stato, responsabile;
- stato visibile con badge colore;
- pulsante "Apri" che porta alla scheda dettaglio;
- pannello laterale "Istruzioni operative";
- collegamenti a procedure e norme.

## 11. Scheda dettaglio processo

Quando clicco "Apri" su un processo, devo vedere:

- descrizione processo;
- procedure collegate;
- norme/requisiti collegati;
- format disponibili;
- task aperti;
- documenti collegati;
- NC collegate;
- audit collegati;
- indicatori;
- istruzioni operative.

Questa schermata e fondamentale.

## 12. Scheda dettaglio procedura

Ogni procedura deve mostrare:

- codice;
- titolo;
- revisione;
- stato;
- processo;
- norme collegate;
- file originale;
- format collegati;
- istruzioni operative;
- scadenze;
- evidenze richieste;
- storico revisioni.

## 13. Scheda format compilabile

Ogni format compilabile deve avere:

- intestazione con codice format;
- impresa;
- processo;
- procedura;
- responsabile;
- data;
- stato;
- campi;
- allegati;
- approvazione;
- storico modifiche.

Stati format:

- bozza;
- compilato;
- in verifica;
- approvato;
- respinto;
- archiviato.

## 14. Importazione dal vecchio sistema qualita

Usare `inventario_sistema_qualita.csv` per popolare:

- documenti;
- procedure;
- allegati;
- area/processo;
- stato iniziale.

Regole:

- cartelle `OLD`, `obsoleto`, `años anteriores` = stato storico/obsoleto;
- documenti P-01/P-25 attuali = procedure da verificare;
- file Excel principali = registri da convertire in format;
- PDF/Word = file allegati;
- non cancellare mai percorso originale.

## 15. Risultato atteso

Alla fine di questa fase, la piattaforma deve permettere di:

- aprire un processo;
- vedere procedure collegate;
- compilare format;
- generare evidenze;
- creare task automatici;
- aprire NC da problemi;
- collegare azioni;
- verificare efficacia;
- bloccare saldature non autorizzabili;
- mostrare dashboard con dati veri.

## 16. Priorita esecutiva per Claude

Implementare in questo ordine:

1. Scheda dettaglio processo.
2. Tabelle per `procedure_map` e `form_template`.
3. Seed iniziale procedure P-01/P-25.
4. Seed iniziale format FMT.
5. Scheda procedura.
6. Motore format compilabili.
7. Automazioni task/reminder.
8. Automazioni NC/azioni.
9. Automazioni saldatura.
10. Importazione inventario documenti.

## 17. Criteri di accettazione

Il lavoro e valido solo se:

- ogni processo apre una scheda utile;
- ogni procedura e collegata a processo e format;
- almeno 20 format sono disponibili;
- si puo compilare un format e salvarlo;
- un format puo generare task o NC;
- i documenti importati compaiono nella pagina Documenti;
- le procedure operative P-01/P-25 sono visibili;
- saldatura ha controlli bloccanti;
- dashboard mostra dati reali, non solo zeri.
