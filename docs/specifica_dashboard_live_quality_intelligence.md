# Specifica Dashboard Live e Quality Intelligence

## 1. Obiettivo

La piattaforma deve permettere alla direzione di capire a primo colpo d'occhio se il gruppo sta lavorando bene o male.

Non basta sapere se un format e stato compilato. Bisogna capire se:

- il processo e stato seguito davvero;
- i controlli sono stati fatti in tempo;
- le evidenze sono coerenti;
- i documenti sono corretti;
- gli operatori hanno lavorato live sul campo;
- le foto e gli allegati dimostrano il lavoro reale;
- le commesse sono chiudibili;
- i fornitori stanno rispettando gli obblighi;
- le imprese del gruppo seguono il sistema o lo aggirano.

La piattaforma deve diventare un sistema di **Quality Intelligence live**.

## 2. Principio guida

Il sistema non deve premiare chi compila tanto per chiudere un format.

Deve misurare la qualita reale del processo attraverso:

- puntualita;
- completezza;
- coerenza documentale;
- prove fotografiche;
- evidenze dal vivo;
- controlli eseguiti;
- firme responsabili;
- non conformita;
- ritardi;
- blocchi;
- ricorrenze;
- affidabilita dell'operatore/fornitore.

## 3. Dashboard direzione gruppo

Creare una dashboard visuale con grafici e indicatori sintetici.

### KPI principali

- indice qualita gruppo;
- indice qualita per impresa;
- indice qualita per commessa;
- checklist completate in tempo;
- checklist completate in ritardo;
- checklist bloccate;
- documenti mancanti;
- documenti scaduti;
- documenti non congruenti;
- NC aperte;
- NC scadute;
- azioni correttive scadute;
- audit pianificati/eseguiti;
- fornitori non conformi;
- operatori in ritardo;
- saldature bloccate;
- dossier non chiudibili.

### Grafici richiesti

1. **Semaforo gruppo**
   - verde: sistema sotto controllo;
   - giallo: attenzione;
   - rosso: criticita;
   - nero: blocchi operativi gravi.

2. **Indice qualita per impresa**
   - barre comparative delle 9 imprese.

3. **Andamento qualita nel tempo**
   - linea settimanale/mensile.

4. **Checklist per stato**
   - completate, in corso, scadute, bloccate.

5. **Documenti per stato**
   - validi, mancanti, scaduti, obsoleti, non congruenti.

6. **NC per gravita**
   - minori, maggiori, critiche.

7. **Puntualita operatori**
   - percentuale task/checklist chiusi entro scadenza.

8. **Qualita fornitori**
   - fornitori qualificati, sospesi, non conformi, documenti scaduti.

9. **Stato commesse**
   - apribili, in corso, bloccate, chiudibili, non chiudibili.

10. **Saldatura e UNE-EN 1090**
   - WPS valide;
   - qualifiche saldatori in scadenza;
   - saldature controllate;
   - saldature non conformi;
   - dossier CE bloccati.

## 4. Indice qualita

Creare un punteggio da 0 a 100.

Calcolo suggerito:

| Area | Peso |
|---|---|
| Checklist completate correttamente | 20 |
| Puntualita task e controlli | 15 |
| Documenti completi e congruenti | 20 |
| NC chiuse nei tempi e con efficacia | 15 |
| Evidenze live valide | 15 |
| Assenza blocchi operativi | 10 |
| Audit e follow-up regolari | 5 |

Penalizzazioni:

- documento obsoleto usato: -10;
- checklist compilata senza allegati richiesti: -10;
- task scaduto critico: -8;
- NC critica aperta: -15;
- saldatura senza controllo VT: -20;
- dossier chiuso incompleto: blocco, punteggio massimo 50;
- evidenza caricata fuori tempo/fuori luogo: -5;
- ripetizione identica sospetta di format: flag da verificare.

Classi:

- 90-100: eccellente;
- 75-89: buono;
- 60-74: attenzione;
- 40-59: critico;
- 0-39: fuori controllo.

## 5. Processo live da app telefonica

La piattaforma deve supportare uso mobile.

Gli operatori devono poter compilare controlli dal telefono, direttamente in cantiere/officina.

Funzioni mobile:

- checklist da fare oggi;
- foto live;
- caricamento documenti;
- firma/conferma operatore;
- note vocali o testo;
- scansione documenti;
- scansione QR/barcode asset/materiali;
- stato task;
- segnalazione NC rapida;
- evidenze merce/materiale dal vivo.

## 6. Evidenze live

Ogni evidenza live deve registrare:

- chi ha caricato;
- data e ora;
- impresa;
- commessa;
- cantiere/officina;
- checklist/fase collegata;
- tipo evidenza;
- file;
- eventuale posizione, se disponibile e autorizzata;
- dispositivo o origine upload;
- note;
- stato verifica.

Tipi evidenza:

- foto materiale;
- foto etichetta;
- foto seriale;
- foto saldatura;
- foto controllo;
- documento scansionato;
- certificato;
- verbale firmato;
- video breve;
- firma operatore;
- firma responsabile.

## 7. Anti-compilazione finta

Il sistema deve ridurre il rischio che gli operatori compilino i format solo per chiuderli.

Controlli richiesti:

- allegati obbligatori per punti critici;
- foto obbligatorie in alcune fasi;
- timestamp automatico;
- blocco modifica dopo approvazione;
- storico modifiche;
- confronto tra data foto/caricamento e data attivita;
- controllo duplicati file;
- controllo compilazioni troppo rapide;
- controllo checklist chiuse tutte insieme in modo sospetto;
- richiesta firma responsabile su fasi critiche;
- campi obbligatori condizionali;
- impossibilita di completare se manca evidenza.

Flag di sospetto:

- checklist completata in meno di tempo minimo configurato;
- tutte le risposte uguali senza note;
- foto riutilizzata;
- documento caricato in sezione sbagliata;
- allegato non coerente con commessa;
- operatore chiude attivita fuori finestra temporale prevista;
- controllo dichiarato ma strumento scaduto.

## 8. Corrispondenza e congruenza

Il sistema deve confrontare format, documenti e realta operativa.

Esempi:

- ricezione materiale: foto materiale + certificato + lotto + commessa devono coincidere;
- saldatura: WPS + WPQR + saldatore + materiale + EXC devono essere coerenti;
- collaudo: verbale + strumento tarato + operatore competente devono coincidere;
- fornitore: documento caricato + scadenza + commessa + qualifica devono coincidere;
- cantiere: checklist apertura + personale + formazione + DPI devono coincidere.

Se la corrispondenza non e dimostrata, il sistema deve aprire alert o blocco.

## 9. Dashboard commessa live

Ogni commessa deve avere una vista live con:

- indice qualita commessa;
- fasi completate;
- fasi bloccate;
- checklist aperte/scadute;
- documenti mancanti;
- evidenze live caricate;
- foto recenti;
- NC aperte;
- task oggi;
- fornitori coinvolti;
- materiali ricevuti;
- controlli eseguiti;
- stato dossier finale.

La direzione deve poter aprire una commessa e capire in 30 secondi se e sana o problematica.

## 10. Feed live qualita

Creare un feed eventi:

- checklist completata;
- foto caricata;
- documento approvato;
- richiesta inviata;
- reminder inviato;
- blocco creato;
- NC aperta;
- NC chiusa;
- saldatura autorizzata;
- controllo non conforme;
- dossier completato.

Il feed deve essere filtrabile per:

- gruppo;
- impresa;
- commessa;
- operatore;
- processo;
- gravita;
- tipo evento.

## 11. Report automatici

Generare report:

- report giornaliero criticita;
- report settimanale qualita gruppo;
- report commesse bloccate;
- report documenti mancanti;
- report operatori/fornitori in ritardo;
- report saldatura e 1090;
- report NC e azioni.

Il report deve evidenziare:

- cosa non va;
- chi deve agire;
- entro quando;
- rischio se non viene fatto.

## 12. Prompt operativo per Claude

Implementare il layer **Quality Intelligence Live** sopra Quality Sentinel.

Priorita:

1. Aggiungere indici qualita gruppo/impresa/commessa.
2. Creare dashboard grafica con KPI e grafici.
3. Creare feed live eventi qualita.
4. Aggiungere evidenze live da mobile.
5. Aggiungere controlli anti-compilazione finta.
6. Aggiungere motore congruenza tra format, documenti, foto, materiali e controlli.
7. Creare report automatici.

## 13. Criteri di accettazione

Il lavoro e valido solo se:

- la direzione capisce in pochi secondi se il gruppo lavora bene o male;
- ogni commessa ha indice qualita;
- ogni impresa ha indice qualita;
- i grafici mostrano dati reali;
- i format compilati senza evidenze critiche non valgono come conformi;
- le foto/documenti live sono collegati a checklist e commesse;
- il sistema segnala compilazioni sospette;
- i blocchi sono visibili;
- i report indicano chi deve fare cosa.

