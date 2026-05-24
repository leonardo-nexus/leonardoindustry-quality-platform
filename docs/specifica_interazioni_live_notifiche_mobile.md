# Specifica interazioni live, popup e notifiche mobile

## 1. Obiettivo

La piattaforma deve essere viva.

Non deve aspettare che l'utente entri in una pagina e cerchi cosa fare. Deve raggiungere l'utente con:

- popup interattivi;
- notifiche in app;
- notifiche su telefoni;
- notifiche su palmari;
- messaggi contestuali;
- richieste di conferma;
- azioni rapide;
- avvisi bloccanti;
- solleciti automatici.

Quality Sentinel deve comportarsi come un assistente operativo attivo.

## 2. Tipi di messaggi

### 2.1 Messaggi informativi

Esempi:

- "Nuova checklist assegnata."
- "Documento caricato correttamente."
- "Foto ricevuta e collegata alla commessa."

Non bloccano il lavoro.

### 2.2 Reminder

Esempi:

- "Tra 7 giorni scade la checklist apertura cantiere."
- "Domani scade la qualifica del saldatore."
- "Manca il certificato materiale richiesto per la commessa."

Devono avere azione rapida:

- apri task;
- carica documento;
- assegna responsabile;
- posticipa con motivazione.

### 2.3 Alert

Esempi:

- "Checklist scaduta."
- "Documento fornitore scaduto."
- "Strumento fuori taratura."
- "NC senza azione correttiva."

Devono apparire in dashboard e come notifica all'utente responsabile.

### 2.4 Popup bloccanti

Esempi:

- "Non puoi chiudere questa fase: manca il verbale di collaudo."
- "Non puoi autorizzare la saldatura: WPS non valida."
- "Non puoi usare questo strumento: taratura scaduta."
- "Non puoi chiudere la commessa: dossier incompleto."

Il popup deve spiegare:

- cosa manca;
- perche blocca;
- chi deve risolvere;
- quale azione fare;
- quale format compilare;
- quale documento caricare.

### 2.5 Coach message

Messaggi guida:

- "Oggi devi fare questi 4 controlli."
- "Per completare questa checklist ti mancano 2 foto e 1 firma."
- "Questa commessa e al 62% di indice qualita: attenzione a documenti mancanti e NC aperte."
- "Questo fornitore sta rallentando la chiusura documentale."

## 3. Canali di notifica

Implementare una struttura pronta per piu canali:

- in_app;
- browser_push;
- mobile_push;
- email;
- sms, futuro;
- whatsapp, futuro;
- teams, futuro.

Nel primo MVP usare almeno:

- notifiche in app;
- popup interattivi;
- email se gia disponibile;
- predisposizione per push mobile/PWA.

## 4. Mobile e palmari

La piattaforma deve essere utilizzabile da:

- smartphone;
- tablet;
- palmari industriali;
- browser mobile;
- futura PWA installabile.

Funzioni mobile prioritarie:

- vedere task di oggi;
- ricevere notifiche;
- aprire popup bloccanti;
- compilare checklist;
- scattare foto;
- allegare documenti;
- firmare/confermare;
- leggere QR/barcode;
- vedere blocchi;
- aprire NC rapida;
- rispondere a richieste documentali.

## 5. Azioni rapide da notifica

Ogni notifica deve, quando possibile, permettere un'azione immediata.

Esempi:

| Notifica | Azioni rapide |
|---|---|
| Documento mancante | carica documento, assegna richiesta, segnala non applicabile |
| Checklist scaduta | apri checklist, richiedi proroga, segnala blocco |
| NC aperta | apri NC, assegna azione, carica evidenza |
| Saldatura bloccata | apri blocco, cambia WPS, verifica qualifica |
| Firma mancante | firma, rifiuta con motivazione, inoltra |
| Fornitore in ritardo | sollecita, chiama/esporta contatto, sospendi |

## 6. Centro notifiche

Creare una pagina:

```text
/notifications
```

Con:

- tutte le notifiche;
- filtri per stato;
- filtri per gravita;
- filtri per impresa;
- filtri per commessa;
- notifiche non lette;
- notifiche scadute;
- notifiche bloccanti;
- storico solleciti.

Stati notifica:

- nuova;
- letta;
- in_lavorazione;
- risolta;
- scaduta;
- ignorata_con_motivazione;

Una notifica critica non puo essere ignorata senza motivazione.

## 7. Popup contestuali

I popup devono comparire nel punto giusto.

Esempi:

- nella commessa, se manca piano qualita;
- nella checklist, se manca allegato;
- nella saldatura, se manca WPS/WPQR;
- nei documenti, se si prova a usare versione obsoleta;
- negli asset, se lo strumento e scaduto;
- nella chiusura commessa, se dossier incompleto.

Non creare popup generici inutili. Devono essere legati a una regola reale.

## 8. Persistenza e audit trail

Ogni notifica importante deve lasciare traccia:

- chi l'ha ricevuta;
- quando;
- canale;
- se e stata letta;
- quando e stata letta;
- azione eseguita;
- eventuale motivazione;
- escalation generata;
- chiusura.

Le notifiche fanno parte della memoria obbligata del sistema.

## 9. Tabelle consigliate

Aggiungere:

- `notification`;
- `notification_recipient`;
- `notification_action`;
- `notification_delivery`;
- `popup_rule`;
- `message_template`;
- `device_registration`;

Campi minimi `notification`:

- id;
- company_id;
- project_id;
- process_id;
- source_type;
- source_id;
- severity;
- title;
- message;
- status;
- due_date;
- created_at;
- resolved_at.

Campi minimi `notification_recipient`:

- notification_id;
- person_id;
- role_id;
- channel;
- read_at;
- action_taken;
- action_at.

Campi minimi `device_registration`:

- person_id;
- device_type;
- device_name;
- push_token;
- last_seen_at;
- active.

## 10. Regole di escalation

Esempio:

```text
T-7: reminder operatore
T-3: reminder operatore + responsabile
T-1: warning operatore + responsabile qualita
T: alert rosso
T+1: NC gestionale se obbligo critico
T+3: escalation direzione impresa
T+7: escalation direzione gruppo
```

Ogni escalation deve essere visibile in dashboard.

## 11. Messaggi da usare

I messaggi devono essere chiari, diretti, operativi.

Esempi:

- "Azione richiesta: carica il certificato materiale entro domani."
- "Blocco operativo: non puoi chiudere questa fase finche manca la firma del responsabile qualita."
- "Richiamo: la checklist e scaduta da 3 giorni."
- "Coach qualita: oggi hai 5 controlli da completare."
- "Congruenza non valida: il certificato caricato non corrisponde al lotto materiale."

## 12. Criteri di accettazione

La piattaforma e viva solo se:

- gli utenti ricevono notifiche senza dover cercare;
- i popup spiegano cosa manca e cosa fare;
- da telefono si possono completare azioni operative;
- ogni notifica ha storico;
- le notifiche critiche generano escalation;
- i blocchi appaiono nel punto esatto del processo;
- la dashboard mostra notifiche, ritardi e solleciti;
- l'utente sa sempre cosa deve fare adesso.

