# mensa
Piattaforma di gestione mensa scolastica

Migrazione da Google Sheets/Apps Script (vedi `docs/ANALISI_FUNZIONALE.md`) verso
Angular + Firebase (vedi `docs/PIANO_MIGRAZIONE_FIREBASE.md`).

## Struttura del repository

- `web/` — Angular standalone (TypeScript strict), UI operatore/famiglia
- `functions/` — Cloud Functions v2 (automazioni: soglia minima, buono usato, ordine fornitore)
- `firestore.rules`, `firestore.indexes.json`, `storage.rules` — regole e indici Firestore/Storage
- `firestore-tests/` — test automatici delle security rules
- `scripts/` — script di supporto (seed dati fittizi sull'emulatore)

Nessun progetto Firebase reale è collegato (`.firebaserc` punta al project id
`demo-mensa`, riservato all'emulatore): tutto il flusso si esegue in locale.

## Con Docker (consigliato — un solo comando)

```
docker compose up --build
```

Avvia in un colpo solo emulatori Firebase (Auth/Firestore/Functions/Pub-Sub/Storage),
seed dei dati fittizi e `ng serve`. Al termine dello startup (log
`firebase-1 | ✔ All emulators ready!`, servizio `seed` uscito con `Seed completato`):

- App: http://localhost:4200/login (utenti di test sotto)
- Emulator UI: http://localhost:4000

`docker compose down` ferma ed elimina tutti i container in modo pulito (a differenza
del flusso manuale, non lascia processi orfani sull'host). Rilanciare `docker compose up`
riparte da dati puliti (rifà anche il seed automaticamente).

**Attenzione**: se in precedenza hai avviato gli emulatori manualmente sull'host (senza
Docker) e sono rimasti processi attivi, `docker compose up` fallirà con "port is already
allocated" sulle stesse porte (4000/9099/8080/5001/8085/9199/4200): chiudi prima quei
processi.

## Setup (senza Docker)

```
npm install
```

## Sviluppo locale senza Docker (Firebase Emulator Suite)

```
npm run emulators   # avvia Auth/Firestore/Functions/Hosting/Storage/Pub-Sub su localhost
npm run seed        # popola l'emulatore con dati fittizi (famiglia F-0001, alunni S-0001/S-0002)
npm run dev:web      # ng serve, puntato agli emulatori
```

Utenti di test creati dal seed (password: `password123`):
- `operatore@esempio.it` — ruolo `admin`
- `famiglia@esempio.it` — ruolo `famiglia`, vede solo i propri figli

## Test

```
npm run test:rules          # test delle Firestore security rules (richiede l'emulatore avviato)
npm run build:functions      # type-check + build delle Cloud Functions
cd web && npx ng test        # unit test Angular
```

## Note

- Nessuna email reale viene inviata finché `ESP_API_KEY` non è configurata in
  `functions/.env` (copiare da `.env.example`): di default le email vengono
  solo loggate in console (`ConsoleEmailSender`).
- `firebase-functions` è pinnato alla v6.x; l'emulatore segnala che è disponibile
  una v7 — upgrade non ancora fatto in questo scaffold (verificare le breaking
  changes prima di aggiornare).
