# 🔥 Piano di Migrazione — Da Google Sheets/Apps Script a Angular + Firebase

> **Versione:** 1.1
> **Data:** Settembre 2026
> **Documento di riferimento:** `docs/ANALISI_FUNZIONALE.md` (sistema attuale)
> **Stato:** Fattibilità e architettura approvate. Domande aperte (§10) risolte — 2 punti restano da confermare prima del go-live (dominio email, retention). Pronti per avvio Fase 1.

---

## 1. Fattibilità in sintesi

**Replicabile 1:1:**
- Tutte le regole di business (BR-01…BR-08): anti-duplicato avviso, reset automatico status, Test Mode, unicità ordine mensile, saldi sempre calcolati e mai inseriti a mano.
- I tre flussi email (avviso soglia, buono usato, ordine fornitore) con template parametrici.
- La logica "saldo = derivato da log, mai editabile" — anzi si rafforza, perché lato Firestore possiamo impedirlo con security rules, non solo con protezione a livello UI come nel foglio.

**Migliora strutturalmente:**
- **Concorrenza**: oggi due operatori che editano lo stesso foglio rischiano race condition sulle formule; Firestore con transazioni/aggregation query elimina il problema.
- **Controllo accessi reale**: oggi chiunque abbia il link al foglio (o accesso Drive) vede tutto; con Auth + custom claims si separano davvero operatore/famiglia/fornitore.
- **Audit trail**: possibile log strutturato di ogni operazione (chi, quando, cosa), oggi assente o affidato alla colonna "Operatore" inserita a mano.
- **Family → più figli**: nel foglio attuale "ID" è di fatto usato come chiave 1:1 alunno↔famiglia (il foglio "Famiglie" è solo una vista con CERCA.VERT sullo stesso ID). Con un modello dati proprio si può finalmente gestire correttamente N figli per famiglia con un unico login/notifica.

**Richiede compromessi:**
- **Nessun invio email nativo**: Firebase non include un servizio SMTP; serve un ESP esterno (SendGrid/Resend/Mailgun) — vedi §5 e §8.
- **Niente editing "a foglio libero"**: l'operatore perde la flessibilità di Google Sheets (copia-incolla multiplo, formule ad-hoc); in cambio guadagna validazione e sicurezza. Se l'operatore usa molto la flessibilità del foglio, va gestito nel change management.
- **Import iniziale**: la migrazione dei dati storici (Log Ricariche/Utilizzi) richiede uno script di import una tantum, non è "drag & drop".
- **Costo/complessità operativa**: si passa da "un file Google gratuito" a un progetto cloud con piano a consumo (Blaze), da monitorare (vedi §8).

**Verdetto**: fattibile senza compromessi sulle regole di business esistenti; i compromessi sono tutti sul lato "flessibilità da foglio di calcolo" vs "applicazione strutturata", che è esattamente il trade-off atteso in una migrazione di questo tipo.

---

## 2. Architettura target

```
┌──────────────────────────────────────────────────────────────────────┐
│  CLIENT                                                              │
│  Angular 18+ standalone, TypeScript strict                           │
│  - App operatore (CRUD alunni/ricariche/utilizzi, dashboard KPI)      │
│  - App famiglia (saldo, storico, sola lettura)                       │
│  - Route guard basate su custom claims (ruolo)                       │
└───────────────────────────┬────────────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼────────────────────────────────────────────┐
│  FIREBASE HOSTING                                                     │
│  Static build Angular, CDN, canale preview per staging                │
└───────────────────────────┬────────────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────────────┐
│  FIREBASE AUTHENTICATION                                              │
│  Provider: Google (per operatore/staff) + Email link o Email/Password │
│  (per famiglie). Custom Claims: role, familyId                       │
└───────────────────────────┬────────────────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────────────────┐
│  CLOUD FIRESTORE (Native mode)                                       │
│  Collezioni: students, families, topUps, usages, monthlyOrders,      │
│  settings, auditLog — Security Rules come unico gatekeeper           │
└──────┬──────────────────────┬───────────────────────┬─────────────────┘
       │ onCreate trigger     │ callable HTTPS         │ query aggregate
┌──────▼──────────────────┐ ┌─▼──────────────────────┐ ┌▼────────────────┐
│ CLOUD FUNCTIONS (2nd gen)│ │ CLOUD SCHEDULER        │ │ Angular reads   │
│ - onUsageCreated          │ │ - job giornaliero 18:00│ │ via Firestore   │
│ - onTopUpCreated          │ │   → checkThresholds    │ │ SDK (realtime)  │
│ - sendSupplierOrder (cb)  │ │   Fn (Pub/Sub)         │ │                 │
│ - checkThresholdsAndAlert │ └────────────────────────┘ └─────────────────┘
└──────┬───────────────────┘
       │ HTTPS API call
┌──────▼───────────────────────────────────────────────────────────────┐
│  SERVIZIO EMAIL ESTERNO (SendGrid / Resend / Mailgun)                 │
│  Dominio verificato con SPF/DKIM, template lato Function, non lato   │
│  provider (per riusare i placeholder [ID][NOME][COGNOME]...)          │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  CLOUD STORAGE (Firebase Storage)                                     │
│  Sostituisce i link Drive per i PDF/immagini dei bonifici, con         │
│  Security Rules che limitano lettura a operatore + famiglia proprietaria│
└────────────────────────────────────────────────────────────────────────┘
```

**Motivazione scelte principali:**
- **Cloud Functions 2nd gen** invece di Apps Script: stesso paradigma "trigger su evento", ma con test unitari, versioning, e limiti di risorse configurabili.
- **Cloud Scheduler + Pub/Sub** invece del trigger orario di Apps Script: identico nella sostanza (cron giornaliero), ma gestito come infrastruttura versionabile (firebase.json / Terraform), non un click su un menu.
- **ESP esterno invece di MailApp/Gmail**: Apps Script usava `MailApp` (quota Workspace); Firebase non ha equivalente nativo. Un ESP dedicato dà deliverability, DKIM/SPF, e log di consegna — necessario perché le email vanno a genitori reali, non solo test.
- **Firestore Native mode** (non Realtime Database): meglio per query strutturate con filtri multipli (alunni sotto soglia, ordini per mese) e per le security rules granulari per-documento.

---

## 3. Modello dati Firestore

### Collezioni principali

```
families/{familyId}
  cognome: string
  emails: string[]          // sostituisce "Email Notifica" — supporta più genitori
  telefono?: string
  createdAt, updatedAt: Timestamp

students/{studentId}
  familyId: string          // riferimento a families — separato da studentId!
  nome, cognome: string
  dataNascita: Timestamp
  classe, sezione: string
  note: string              // dato potenzialmente sensibile, vedi §9
  status: 'attivo' | 'archiviato'
  // campi DENORMALIZZATI (equivalenti alle formule del foglio Alunni)
  ticketsPurchased: number
  ticketsUsed: number
  ticketsRemaining: number  // = purchased - used, ricalcolato server-side
  ticketStatus: 'sufficienti' | 'sotto_soglia' | 'esaurito'
  lastAlertSentAt: Timestamp | null   // sostituisce "Status Avviso"
  createdAt, updatedAt: Timestamp

topUps/{topUpId}                     // Log Ricariche
  studentId: string
  familyId: string          // denormalizzato per query rapide
  amount: number
  bonificoRef: string
  documentPath: string      // path su Cloud Storage, non link Drive
  operatorUid: string
  date: Timestamp
  createdAt: Timestamp (server)

usages/{usageId}                     // Log Utilizzi
  studentId: string
  familyId: string
  quantity: number
  classSection: string
  note?: string
  operatorUid: string
  date: Timestamp
  createdAt: Timestamp (server)

monthlyOrders/{yyyy-mm}              // es. "2026-09" — l'ID stesso garantisce unicità (BR-08)
  mealsCount: number
  supplierEmail: string
  status: 'bozza' | 'inviato'
  sentAt: Timestamp | null
  sentByUid: string | null

settings/global                       // documento singolo, sostituisce foglio Impostazioni
  minThreshold: number
  testMode: boolean
  testEmails: string[]
  templates: { alertSubject, alertBody, usedBody, orderBody: string }
  supplierEmail: string

auditLog/{logId}                      // traccia SGSI-style (vedi §9)
  action: string
  actorUid: string
  targetPath: string
  before?: object
  after?: object
  timestamp: Timestamp (server)
```

### Indici compositi necessari
- `students`: `familyId ASC, status ASC` (dashboard famiglia con più figli)
- `students`: `ticketStatus ASC, ticketsRemaining ASC` (dashboard KPI "sotto soglia")
- `usages`: `studentId ASC, date DESC` (storico per famiglia)
- `usages`: `date ASC` con range per mese (calcolo ordine fornitore)
- `topUps`: `studentId ASC, date DESC`

### Sostituzione di SOMMA.SE / CERCA.VERT — due opzioni (trade-off esplicito)

**Opzione A — Denormalizzazione con transazione (consigliata per questo volume):**
Ogni scrittura in `topUps`/`usages` aggiorna in **una transazione Firestore** i campi denormalizzati su `students/{id}` (`ticketsPurchased`/`ticketsUsed`/`ticketsRemaining`/`ticketStatus`). È l'equivalente diretto di SOMMA.SE, ma calcolato una volta alla scrittura invece che ad ogni lettura.
- Pro: letture istantanee e a costo minimo (dashboard, elenco alunni), esattamente il pattern usato oggi dal foglio.
- Contro: le Cloud Functions con trigger Firestore sono "at-least-once" — un retry potrebbe incrementare due volte. Mitigazione: la Function scrive anche un campo `processedTopUpIds`/idempotency check prima di applicare l'incremento, oppure si usa `FieldValue.increment()` dentro una transazione che verifica un flag `processed: true` sul documento sorgente.

**Opzione B — Query di aggregazione server-side (`sum()`/`count()`):**
Firestore supporta query di aggregazione (`count()`, `sum()`, `average()`) fatturate come una singola lettura indipendentemente dal numero di documenti. Si potrebbe calcolare `ticketsRemaining` on-demand con una query invece di denormalizzare.
- Pro: nessun rischio di doppio conteggio, sempre coerente col log sorgente (source of truth reale, non copia).
- Contro: un round-trip di query in più per ogni vista lista (accettabile a ~200 alunni, meno performante su liste molto grandi con filtri combinati).

**Scelta consigliata**: Opzione A come cache di lettura veloce, ma con la Opzione B usata come *verifica di sicurezza* subito prima di inviare l'email di soglia minima (per evitare che un bug di denormalizzazione mandi avvisi errati) — è il punto più delicato del sistema (BR-01/BR-02), vale la pena il doppio controllo lì.

---

## 4. Autenticazione e ruoli

**Provider consigliati:**
- **Operatore/admin**: login Google (stesso account Workspace/Gmail della scuola) — coerente con l'ecosistema Google già in uso.
- **Famiglia**: email link (passwordless) o email/password — evita di richiedere un account Google alle famiglie che magari non ne hanno uno "istituzionale".
- **Fornitore**: **confermato — nessun login**. Continua a ricevere solo l'email dell'ordine mensile, come oggi. Nessun account, nessuna superficie di attacco aggiuntiva lato fornitore.

**Custom Claims** (impostati solo da Cloud Function, mai dal client):
```
{ role: 'admin' | 'operatore' | 'famiglia' | 'sola_lettura', familyId?: string }
```

**Matrice ruoli × permessi:**

| Azione | Admin | Operatore | Famiglia | Sola lettura |
|---|---|---|---|---|
| Modificare `settings` (soglia, template, Test Mode) | ✅ | ❌ | ❌ | ❌ |
| Creare `topUps` / `usages` | ✅ | ✅ | ❌ | ❌ |
| Leggere tutti gli `students` | ✅ | ✅ | ❌ | ✅ |
| Leggere solo i propri figli (`familyId` match) | — | — | ✅ | — |
| Inviare ordine fornitore | ✅ | ❌ (o ✅ se delegato) | ❌ | ❌ |
| Vedere `auditLog` | ✅ | ❌ | ❌ | ❌ |
| Caricare documento bonifico (Storage) | ✅ | ✅ | ❌ (upload); ✅ (solo lettura propri) | ❌ |

**Security Rules Firestore (estratto commentato, non implementazione completa):**
```javascript
function isRole(r) { return request.auth.token.role == r; }
function isOwnFamily(familyId) {
  return request.auth.token.role == 'famiglia'
      && request.auth.token.familyId == familyId;
}

match /students/{studentId} {
  // lettura: staff vede tutto, famiglia solo i propri figli
  allow read: if isRole('admin') || isRole('operatore') || isRole('sola_lettura')
              || isOwnFamily(resource.data.familyId);
  // scrittura MAI dal client: i saldi si aggiornano solo via Cloud Function
  // (service account bypassa le rules), quindi qui si nega sempre
  allow write: if false;
}

match /topUps/{topUpId} {
  allow create: if isRole('admin') || isRole('operatore');
  allow read: if isRole('admin') || isRole('operatore')
              || isOwnFamily(resource.data.familyId);
  allow update, delete: if false; // log immutabile, come il foglio storico
}

match /settings/{doc} {
  allow read: if isRole('admin') || isRole('operatore'); // per leggere soglia in UI
  allow write: if isRole('admin');
}
```

**Rischio OWASP rilevante**: A01 (Broken Access Control) è il rischio principale in questo dominio — **mai** fidarsi di un flag di ruolo salvato nel documento Firestore o passato dal client: solo i custom claims del token JWT, impostati server-side, sono attendibili. I saldi (`ticketsRemaining` ecc.) devono essere scrivibili **solo** dalle Cloud Functions (che usano l'Admin SDK e bypassano le rules), mai direttamente dal client — replica rafforzata della protezione "colonne protette" del foglio attuale.

---

## 5. Automazioni — mapping Apps Script → Firebase

| Funzione Apps Script | Equivalente Firebase | Note |
|---|---|---|
| `controllaSoglieEInviaAvvisi()` (trigger 18:00 + menu) | Cloud Scheduler (cron `0 18 * * *`, timezone Europe/Rome) → Pub/Sub → Cloud Function `checkThresholdsAndSendAlerts` | Legge `settings`, interroga `students` con `ticketsRemaining <= minThreshold AND lastAlertSentAt == null`; invia via ESP; scrive `lastAlertSentAt`; azzera `lastAlertSentAt` per chi è tornato sopra soglia (stessa Function, stesso ciclo) |
| `inviaNotificaBuonoUsato(idAlunno)` | Firestore trigger `onDocumentCreated` su `usages/{id}` → Function `onUsageCreated` | La creazione del documento (fatta da una callable Function invocata dall'UI operatore) è già l'evento; niente pulsante separato |
| `inviaOrdineFornitore()` | Callable HTTPS Function `sendSupplierOrder({month, year})` | La Function crea/legge `monthlyOrders/{yyyy-mm}` in una transazione: se `status == 'inviato'` rifiuta (sostituisce il controllo "Stato Ordine" — BR-08 by design, non by convenzione) |
| `installaTriggerGiornaliero()` | Non serve più un'azione utente: il job Cloud Scheduler è definito in `firebase.json`/Terraform e deployato una volta dal team di sviluppo | Elimina il rischio di trigger duplicati creati per errore da menu |
| `onOpen()` (menu Sheets) | Routing Angular + guardie di ruolo (le voci di menu diventano voci di navigazione visibili solo al ruolo giusto) | — |

**Nota invio email**: ogni Function che invia email chiama l'ESP esterno con timeout e retry limitato (non retry infinito, per evitare loop di costo — vedi §8). Il rendering dei placeholder (`[ID]`, `[NOME]`, `[COGNOME]`, `[BIGLIETTI]`, `[RIMANENTI]`, `[PASTI]`, `[MESE]`, `[ANNO]`) resta identico a oggi, letto da `settings.templates`, per non richiedere retraining dell'operatore.

**Test Mode**: stesso identico comportamento (BR-03) — la Function legge `settings.testMode`; se `true`, sovrascrive i destinatari con `settings.testEmails` e aggiunge prefisso `[TEST]` all'oggetto, **indipendentemente** da cosa il chiamante ha passato (il controllo va fatto lato server, mai delegato al client, per evitare che un bug/manomissione lato Angular invii email reali durante i test).

---

## 6. Mappa di migrazione

| Foglio/Funzione attuale | Componente nuovo | Note |
|---|---|---|
| Foglio `Dashboard` | Componente Angular `DashboardComponent` + query aggregate Firestore | KPI calcolati con `count()`/`sum()` invece di `CONTA.SE`/`SOMMA` |
| Foglio `Alunni` | Collezione `students` + `StudentListComponent`/`StudentDetailComponent` | Colonne protette → security rules `allow write: if false` |
| Foglio `Famiglie` | Collezione `families` + vista filtrata di `students` per `familyId` | Diventa relazione reale 1-a-N, non più vista con CERCA.VERT sullo stesso ID |
| Foglio `Log Ricariche` | Collezione `topUps` + form `TopUpFormComponent` | Upload bonifico → Cloud Storage invece di link Drive manuale |
| Foglio `Log Utilizzi` | Collezione `usages` + form `UsageFormComponent` | Trigger automatico dell'email alla creazione, non pulsante manuale |
| Foglio `Ordine Mensa` | Collezione `monthlyOrders` + `SupplierOrderComponent` | Unicità mensile garantita dall'ID documento, non da un controllo di stato manuale |
| Foglio `Impostazioni` | Documento `settings/global` + `SettingsComponent` (solo admin) | Stessi parametri, editabili solo da ruolo admin |
| `controllaSoglieEInviaAvvisi()` | Cloud Function schedulata | — |
| `inviaNotificaBuonoUsato()` | Cloud Function trigger `onCreate` | — |
| `inviaOrdineFornitore()` | Cloud Function callable | — |
| Link Google Drive ai bonifici | Cloud Storage con security rules per-famiglia | Migrazione dei file esistenti da fare in fase di import (§7) |
| Permessi impliciti (chiunque ha il link Sheets) | Firebase Auth + custom claims + Firestore rules | Cambio più significativo lato sicurezza |

---

## 7. Piano di lavoro

| Fase | Deliverable | Effort (gg/uomo, stima) |
|---|---|---|
| 0. Discovery & chiarimenti | Risposte alle domande aperte (§10), requisiti finali firmati | 2-3 |
| 1. Setup infrastruttura | Progetto Firebase, Hosting, Auth configurato, CI/CD (build+deploy), Firestore rules skeleton | 3-5 |
| 2. Modello dati + import | Script di import una tantum da Google Sheets → Firestore (con validazione e log degli errori) | 4-6 |
| 3. CRUD core Angular | UI operatore: alunni, ricariche, utilizzi, famiglie; guardie di ruolo | 10-15 |
| 4. Automazioni email | Function soglia/buono usato/ordine fornitore, integrazione ESP, Test Mode | 6-8 |
| 5. Dashboard KPI | Vista di sintesi con query aggregate | 3-4 |
| 6. Sicurezza & hardening | Security rules complete, test delle rules con emulatore, skill `security-review` | 4-5 |
| 7. UAT & go-live | Test con Test Mode=ON, formazione operatore, cutover, Test Mode=OFF | 3-5 |
| 8. Post go-live | Monitoraggio, budget alert, piccoli fix | continuativo (1-2 gg/settimana per 2-3 settimane) |

**Totale stimato**: ~35-50 giorni/uomo (ordine di grandezza, non preventivo vincolante — dipende dalle risposte a §10, in particolare la gestione multi-figlio e il portale fornitore).

---

## 8. Costi e limiti

**Piano Blaze necessario perché:**
- Cloud Scheduler e chiamate HTTP in uscita dalle Cloud Functions (verso l'ESP) non sono disponibili sul piano Spark gratuito.
- Blaze richiede una carta di credito collegata, ma include comunque le stesse quote gratuite di Spark come base, con pagamento solo per l'eccedenza.

**Stima per ~200 alunni (ordine di grandezza, non fattura):**

| Servizio | Quota gratuita mensile | Uso stimato (200 alunni) | Costo atteso |
|---|---|---|---|
| Firestore | 50k letture/giorno, 20k scritture/giorno gratis | Poche migliaia di operazioni/giorno | **€0** |
| Cloud Functions (2nd gen) | 2M invocazioni/mese gratis | Poche centinaia/giorno | **€0** |
| Cloud Scheduler | 3 job gratis/mese | 1 job | **€0** |
| Hosting | 10 GB storage, 360 MB/giorno trasferimento gratis | App Angular ~2-5 MB | **€0** |
| Cloud Storage (bonifici) | 5 GB gratis | Qualche centinaio di PDF | **€0** |
| Servizio email (ESP) | Resend: 3.000 email/mese gratis; SendGrid: 100/giorno gratis | Stima <500-1000 email/mese | **€0** (piano free) o pochi € se si supera |

**Costo mensile atteso**: **€0-10/mese** a questo volume, a patto di restare nei piani free dell'ESP e non introdurre loop di errore.

**Rischio da segnalare**: un bug che genera un trigger ricorsivo (es. una Cloud Function che riscrive un documento che rilancia se stessa) può generare un costo anomalo in poche ore — è un rischio di "cost-based DoS" involontario, non malevolo. Mitigazione: impostare **budget alert** su Google Cloud Billing (es. avviso a €10/€25) fin dal primo deploy, e limitare la concorrenza massima delle Functions critiche.

---

## 9. Rischi e conformità

**GDPR — punti di attenzione specifici:**
- **Dati di minori**: nome, cognome, data di nascita, classe/sezione sono dati personali di minori. Base giuridica plausibile: esecuzione di un servizio richiesto dalla famiglia (contratto) o compito di interesse pubblico della scuola — **da far validare dal DPO/Responsabile SGSI**, non è una decisione tecnica.
- **Campo "Note" (es. allergie)**: nel foglio attuale contiene note come "Allergia a Licis" — questo è **dato relativo alla salute**, categoria particolare ex art. 9 GDPR. **Confermato (2026-09-11): il consenso esplicito dei genitori risulta già raccolto** — il campo può essere migrato, ma va documentato in `students` (o in un documento collegato) un riferimento al modulo di consenso raccolto (es. `consentRef`), per poter dimostrare la base giuridica in caso di verifica. Accesso al campo comunque ristretto a admin/operatore/famiglia proprietaria (mai a "sola lettura" o export generico).
- **Minimizzazione**: non replicare campi non necessari (es. "YEP!" indicatore visivo del foglio non ha valore funzionale, va scartato in migrazione).
- **Retention**: **da chiarire con la scuola/DPO** (confermato come punto ancora aperto). Nel frattempo si implementa solo `students.status = 'archiviato'` come soft-delete manuale, **senza cancellazione o anonimizzazione automatica** — nessuna policy di retention viene inventata lato tecnico in assenza di indicazione formale. Va ripreso prima del go-live definitivo, idealmente dentro la DPIA.
- **Diritti dell'interessato**: un genitore con account "famiglia" deve poter esportare/richiedere cancellazione dei propri dati — funzionalità da prevedere anche solo come procedura manuale supportata dall'admin, se non nella prima release.

**Backup:**
- Firestore è replicato multi-regione di default, ma questo non sostituisce un backup a fini di recovery da errore umano/applicativo. Va attivato un **export schedulato** (Firestore managed export verso Cloud Storage, con retention e cifratura), non presente di default.
- I documenti Cloud Storage (bonifici) vanno inclusi nel piano di backup/versioning.

**Audit log:**
- La collezione `auditLog` proposta in §3 copre esattamente il requisito "le conversazioni/azioni possono essere evidenza SGSI" richiamato dalle policy dell'organizzazione: ogni modifica a `students`, `settings`, invio email o ordine fornitore va tracciata con attore, timestamp server-side, e diff prima/dopo.
- Da integrare con Cloud Audit Logs di GCP per le operazioni infrastrutturali (deploy, modifiche a security rules).

**Rischi OWASP/CWE riassunti** (dettaglio già distribuito nelle sezioni sopra):
- **A01 Broken Access Control** — mitigato da custom claims + rules server-side (§4).
- **A04 Insecure Design** — mitigato separando ruoli e negando scrittura diretta dei saldi (§3, §4).
- **A08 Software and Data Integrity Failures** — timestamp e ID generati server-side, mai dal client, per evitare manomissione di date ricariche/utilizzi.
- **A09 Security Logging Failures** — coperto da `auditLog` + Cloud Logging.
- **Cost-based DoS involontario** (non in OWASP Top 10 ma rilevante qui) — mitigato da budget alert (§8).

**Promemoria conforme alle policy dell'organizzazione**: questa analisi tecnica non sostituisce un'eventuale DPIA (Valutazione d'Impatto sulla Protezione dei Dati) — dato il trattamento di dati di minori e potenzialmente dati sanitari (allergie), **è raccomandabile una DPIA formale prima del go-live**, con validazione del DPO. Analogamente, l'attivazione di un piano Blaze e la scelta dell'ESP andrebbero passate da un change management formale se l'organizzazione lo richiede.

---

## 10. Decisioni prese (2026-09-11)

| # | Domanda | Decisione | Impatto |
|---|---|---|---|
| 1 | Modello famiglia↔alunni | **Confermato: 1 famiglia, più figli.** | Modello `families`/`students` separato di §3 confermato senza modifiche — nessun refactor futuro necessario su questo punto. |
| 2 | Base giuridica campo "Note" (allergie) | **Consenso già raccolto dai genitori.** | Il campo si migra, con l'aggiunta di un riferimento al consenso (`consentRef`) per tracciabilità — vedi §9 aggiornato. Accesso comunque ristretto per minimizzazione. |
| 3 | Dominio email per l'ESP | **Non ancora deciso.** Si parte con il dominio condiviso del provider ESP come default. | ⚠️ **Da rivedere prima del go-live in produzione**: un dominio condiviso ha deliverability/professionalità inferiori (email possono finire in spam, mittente non riconoscibile come la scuola). Non bloccante per sviluppo e UAT in Test Mode. |
| 4 | Accesso fornitore | **Confermato: solo email, nessun portale.** | Nessun ruolo "fornitore" in Auth/claims — semplifica §4 e riduce l'effort di Fase 3/4 stimato in §7. |
| 5 | Retention dati alunno dopo uscita | **Da chiarire con scuola/DPO — ancora aperto.** | Interim: solo `students.status = 'archiviato'`, nessuna cancellazione/anonimizzazione automatica implementata finché non arriva una policy formale (idealmente in sede di DPIA). |

**Punti ancora da chiudere prima del go-live** (non bloccano l'avvio dello sviluppo):
- Dominio email definitivo con SPF/DKIM per l'ESP (punto 3).
- Policy di retention formale da scuola/DPO (punto 5), da integrare eventualmente nella DPIA raccomandata in §9.
