# Backlog MVP app qualita ISO e UNE-EN 1090

## Obiettivo MVP

Costruire una prima app usabile per controllare:

- imprese del gruppo;
- processi;
- documenti;
- scadenze;
- audit;
- non conformita;
- azioni;
- persone/competenze;
- strumenti;
- modulo base saldatura e UNE-EN 1090.

## Sprint 1 - Fondazione

### Funzioni

- Creare anagrafica gruppo Leonardoindustry.
- Creare anagrafica 9 imprese.
- Creare sedi/officine/cantieri.
- Creare utenti e ruoli.
- Creare elenco processi master.
- Creare elenco norme e requisiti principali.

### Output

- Dashboard iniziale gruppo.
- Scheda impresa.
- Scheda processo.

### Dati minimi

- company_group
- company
- site
- process
- standard
- standard_requirement

## Sprint 2 - Documenti e scadenze

### Funzioni

- Importare inventario documenti.
- Classificare documenti attivi/obsoleti/storici.
- Collegare documenti a processo e norma.
- Gestire revisioni.
- Creare scadenziario.
- Generare reminder 30/7/1 giorni.

### Output

- Registro documenti controllati.
- Calendario scadenze.
- Allarmi per documenti in revisione.

### Dati minimi

- document
- document_revision
- task
- reminder
- file_attachment

## Sprint 3 - Audit, NC e azioni

### Funzioni

- Piano audit.
- Checklist audit per norma/processo.
- Apertura non conformita.
- Analisi causa.
- Azioni correttive.
- Verifica efficacia.

### Output

- Registro audit.
- Registro NC.
- Registro azioni.
- Dashboard NC aperte/scadute.

### Dati minimi

- audit
- audit_checklist
- audit_finding
- non_conformity
- corrective_action

## Sprint 4 - Persone, formazione e competenze

### Funzioni

- Anagrafica persone.
- Ruoli.
- Competenze.
- Formazione.
- Scadenze corsi e abilitazioni.
- Blocco operativo se competenza scaduta.

### Output

- Matrice competenze.
- Dashboard formazione.
- Allarmi scadenza.

### Dati minimi

- person
- role
- competence
- person_competence
- training_event

## Sprint 5 - Attrezzature, strumenti e veicoli

### Funzioni

- Inventario strumenti.
- Inventario saldatrici.
- Inventario veicoli.
- Tarature.
- Manutenzioni.
- Revisioni.
- Allegati certificati.

### Output

- Registro asset.
- Scadenze tarature/manutenzioni.
- Blocchi su strumenti scaduti.

### Dati minimi

- asset
- asset_event
- calibration_record

## Sprint 6 - Modulo saldatura base

### Funzioni

- Anagrafica processi saldatura.
- WPS.
- WPQR.
- Qualifiche saldatori.
- Materiali e certificati.
- Registro saldature.
- Controlli VT/CND.
- NC saldatura.

### Output

- Scheda WPS.
- Scheda saldatore.
- Registro saldature.
- Alert qualifica saldatore scaduta.
- Alert WPS non compatibile.

### Dati minimi

- welding_process
- wps
- wpqr
- welder_qualification
- material_lot
- weld
- weld_inspection

## Sprint 7 - Commesse e piano qualita

### Funzioni

- Apertura commessa.
- Piano qualita commessa.
- Piano controlli ITP/PPI.
- Collegamento materiali, saldature, controlli, NC.
- Dossier finale.

### Output

- Scheda commessa.
- Checklist apertura/chiusura.
- Dossier commessa.

### Dati minimi

- project
- project_quality_plan
- inspection_test_plan
- inspection_point
- ce_dossier

## Sprint 8 - Ambiente, sicurezza e riesame

### Funzioni

- Aspetti ambientali.
- Consumi.
- Incidenti/quasi incidenti.
- Emergenze.
- Obiettivi e indicatori.
- Riesame direzione.

### Output

- Dashboard ambiente.
- Dashboard sicurezza.
- Report riesame.

### Dati minimi

- environmental_aspect
- consumption_record
- incident
- emergency_drill
- objective
- indicator
- management_review

## Priorita immediata

La prima schermata da costruire deve essere una dashboard semplice:

- imprese;
- scadenze rosse/arancioni;
- NC aperte;
- audit prossimi;
- documenti da revisionare;
- qualifiche saldatori in scadenza;
- strumenti/tarature in scadenza;
- commesse aperte.

## Regole operative del MVP

1. Non si puo chiudere una NC senza azione e verifica.
2. Non si puo usare una procedura obsoleta.
3. Non si puo autorizzare una saldatura senza WPS valida.
4. Non si puo autorizzare una saldatura con saldatore scaduto.
5. Non si puo chiudere una commessa 1090 senza dossier.
6. Ogni scadenza deve avere responsabile.
7. Ogni evidenza deve essere collegata a processo e impresa.

