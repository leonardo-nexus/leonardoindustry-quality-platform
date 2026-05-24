# Prompt Claude - Implementare Quality Sentinel

Devi implementare il modulo **Quality Sentinel** nella piattaforma Leonardo Quality.

Leggi e applica integralmente:

- `specifica_quality_sentinel.md`
- `specifica_dashboard_live_quality_intelligence.md`
- `specifica_interazioni_live_notifiche_mobile.md`
- `manifesto_funzione_piattaforma_qualita.md`
- `prompt_claude_popolamento_automazioni_format_qualita.md`
- `catalogo_format_compilabili_qualita.csv`
- `mappa_procedure_format_processi.csv`

## Obiettivo

La sezione qualita deve diventare un **Quality Control Operating System**, non un archivio documentale.

Il modulo deve guidare gli operatori, generare richieste, compilare checklist, verificare congruenza documentale, lanciare alert, fare escalation, creare NC e bloccare le fasi non conformi.

Inoltre deve produrre grafici e indicatori live per far capire alla direzione, a primo colpo d'occhio, se il gruppo lavora bene o male. I format compilati senza evidenze, foto, documenti coerenti e controlli reali non devono essere considerati pienamente conformi.

## Implementare in questo ordine

### 1. Database

Aggiungi migration per:

- `quality_template`
- `quality_template_phase`
- `quality_template_checklist`
- `quality_plan`
- `quality_plan_phase`
- `quality_checklist`
- `quality_checklist_item`
- `quality_request`
- `quality_document_requirement`
- `quality_document_check`
- `quality_block`
- `quality_event_log`
- `quality_score`
- `country_rule`
- `national_requirement`

Ogni tabella operativa deve avere:

- `company_id`;
- `project_id`, se collegata a commessa;
- `process_id`, se applicabile;
- `responsible_id`;
- `status`;
- `due_date`, se applicabile;
- `created_at`;
- `updated_at`;
- storico tramite `quality_event_log`.

### 2. Seed dati

Creare seed per:

- template qualita Italia;
- template qualita Spagna;
- template generico altro paese;
- fasi standard commessa;
- checklist standard;
- richieste documentali standard;
- regole paese iniziali;
- format da `catalogo_format_compilabili_qualita.csv`;
- mappa procedure da `mappa_procedure_format_processi.csv`.

### 3. UI modulo Quality Sentinel

Creare pagina:

```text
/quality-sentinel
```

Con:

- dashboard qualita;
- commesse con indice qualita;
- checklist aperte;
- documenti mancanti;
- richieste pendenti;
- blocchi operativi;
- NC qualita;
- operatori in ritardo;
- fornitori non conformi.

### 4. Piano qualita commessa

In ogni commessa aggiungere tab:

```text
Piano Qualita
```

Funzioni:

- selezione template;
- generazione piano;
- generazione fasi;
- generazione checklist;
- generazione richieste documentali;
- stato avanzamento;
- indice qualita;
- blocchi.

### 5. Checklist obbligatorie

Creare schermata checklist con:

- fase;
- punto checklist;
- responsabile;
- scadenza;
- esito;
- allegati obbligatori;
- firma/conferma;
- note;
- stato.

Regole:

- punto obbligatorio incompleto blocca completamento;
- punto critico non conforme genera NC;
- allegato obbligatorio mancante blocca checklist;
- checklist scaduta genera alert.

### 6. Motore congruenza documentale

Implementare funzione server:

```text
runQualityDocumentChecks(projectId)
```

Deve verificare:

- documenti mancanti;
- documenti scaduti;
- documenti obsoleti;
- allegati nel posto sbagliato;
- certificati non compatibili;
- documentazione incompleta per fase;
- documentazione incompleta per chiusura lavori.

Output:

- lista controlli;
- esito;
- gravita;
- messaggio;
- azione consigliata;
- eventuale blocco;
- eventuale task.

### 7. Richieste automatizzate

Implementare:

- creazione richiesta;
- assegnazione destinatario;
- deadline;
- stato;
- storico solleciti;
- upload allegato da destinatario;
- accettazione/respingimento da responsabile.

### 8. Alert ed escalation

Implementare job o funzione schedulabile:

```text
runQualityEscalations()
```

Logica:

- T-7 promemoria;
- T-3 avviso;
- T-1 warning;
- scaduto: task scaduto o NC gestionale;
- oltre X giorni: escalation direzione.

### 9. Blocchi operativi

Implementare tabella e UI `quality_block`.

Tipi blocco:

- documento_mancante;
- documento_scaduto;
- documento_obsoleto;
- checklist_incompleta;
- firma_mancante;
- allegato_mancante;
- fornitore_non_conforme;
- strumento_non_valido;
- saldatura_non_autorizzabile;
- dossier_incompleto;
- nc_aperta.

Un blocco deve avere:

- origine;
- gravita;
- descrizione;
- responsabile;
- stato;
- azione richiesta;
- data apertura;
- data chiusura.

### 10. Coach operativo

In dashboard e in commessa mostrare messaggi tipo:

- "Oggi devi fare questi controlli."
- "Questa commessa non puo avanzare perche manca questo documento."
- "Per chiudere questa fase mancano 2 firme e 1 allegato."
- "Hai 3 checklist in ritardo."
- "Questo fornitore non ha caricato il certificato richiesto."

Non usare messaggi generici. Devono essere collegati a dati reali.

### 11. Quality Intelligence Live

Implementare:

- indice qualita gruppo;
- indice qualita per impresa;
- indice qualita per commessa;
- grafici checklist per stato;
- grafici documenti per stato;
- grafici NC per gravita;
- puntualita operatori;
- qualita fornitori;
- stato commesse;
- stato saldatura/UNE-EN 1090;
- feed live eventi qualita;
- evidenze live da telefono;
- foto obbligatorie per controlli critici;
- controlli anti-compilazione finta;
- report giornalieri/settimanali criticita.

La direzione deve poter capire in pochi secondi se il gruppo segue il sistema o lo aggira.

### 12. Piattaforma viva: popup e notifiche mobile

Implementare un sistema di interazioni live:

- popup contestuali;
- notifiche in app;
- centro notifiche;
- predisposizione push mobile/PWA;
- messaggi su telefono e palmari;
- azioni rapide da notifica;
- storico lettura/azioni;
- escalation notifiche critiche.

La piattaforma non deve aspettare che l'utente cerchi cosa fare. Deve raggiungerlo e dirgli cosa fare adesso.

## Criteri di accettazione

Il modulo e valido solo se:

- una commessa puo generare un piano qualita da template;
- il piano crea fasi, checklist e richieste documentali;
- le checklist sono compilabili;
- un allegato obbligatorio mancante blocca la checklist;
- una fase non conforme crea blocco o NC;
- la dashboard mostra blocchi e ritardi;
- il motore documentale trova almeno documenti mancanti/obsoleti/scaduti;
- ogni evento viene scritto nello storico;
- i ruoli vedono solo cio che devono vedere.
- la dashboard mostra grafici reali;
- ogni commessa ha indice qualita;
- le evidenze live sono collegate a checklist e commesse;
- il sistema segnala compilazioni sospette.
- esistono notifiche e popup contestuali;
- da mobile/palmare si possono vedere task, compilare checklist e caricare foto;
- le notifiche critiche generano escalation.
