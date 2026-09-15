# Documento di Analisi Funzionale e Tecnica
## Sistema di Gestione del Servizio di Refezione Scolastica

**Committente:** [Ente / Amministrazione] — Servizio Pubblica Istruzione
**Destinatario:** Operatori economici / Società di consulenza informatica (documento di indirizzo per affidamento)
**Versione:** 2.0 — evoluzione dell'Analisi Funzionale v1.0 (Google Sheets + Apps Script)
**Data:** Settembre 2026
**Classificazione:** Interno — contiene descrizioni di trattamenti di dati personali di minori
**Referente tecnico:** Gianpiero Torrisi

---

## Avvertenze preliminari

Questo documento è un **documento di indirizzo tecnico-funzionale** redatto dal committente. Non costituisce capitolato di gara né determina approvata: prima di essere allegato a una procedura di affidamento deve essere validato da RUP, Responsabile SGSI/Referente sicurezza, DPO e Servizio Finanziario dell'Ente, e deve essere accompagnato dagli atti formali previsti (determina a contrarre, DPIA, analisi del rischio, eventuale valutazione di riuso ex art. 68-69 CAD).

Il documento parte da un prototipo interno realizzato su Google Sheets + Apps Script e da un secondo prototipo di migrazione Angular + Firebase. Entrambi sono **prototipi funzionali di studio**: servono a dimostrare il flusso desiderato, non costituiscono vincolo architetturale né base di codice da riutilizzare così com'è. Le criticità di entrambi sono elencate al §14.

---

# PARTE A — ANALISI FUNZIONALE

## 1. Scopo e obiettivi

### 1.1 Obiettivo generale
Dotare l'Amministrazione di una piattaforma digitale per la gestione completa del servizio di refezione scolastica, che sia **sicura** (trattamento conforme di dati di minori, inclusi dati sanitari), **usabile** dai tre profili d'uso reali (famiglie, insegnanti, operatori amministrativi) e **integrata** con gli standard obbligatori della PA italiana.

### 1.2 Obiettivi specifici misurabili

| # | Obiettivo | Indicatore di successo (proposto) |
|---|---|---|
| OB-01 | Eliminare la registrazione manuale dei pagamenti | 100% delle ricariche incassate via pagoPA con riconciliazione automatica |
| OB-02 | Rendere la rilevazione presenze in classe rapida e non invasiva | Rilevazione completa di una classe ≤ 60 secondi, ≤ 3 tap per l'appello standard |
| OB-03 | Azzerare gli errori di addebito | Scostamento pasti rilevati / pasti fatturati dal fornitore < 0,5% mensile |
| OB-04 | Dare alle famiglie visibilità in autonomia | ≥ 70% delle famiglie attive sul portale entro il 2° anno; riduzione richieste allo sportello |
| OB-05 | Ridurre la morosità | Riduzione del credito insoluto a fine anno scolastico rispetto alla baseline |
| OB-06 | Garantire la sicurezza alimentare | 100% delle diete speciali visibili al personale autorizzato al momento della somministrazione |
| OB-07 | Conformità normativa | Esito positivo di audit accessibilità, DPIA e verifica sicurezza pre-collaudo |

### 1.3 Fuori ambito (salvo diversa indicazione in sede di gara)
- Gestione magazzino e produzione pasti presso il centro cottura del fornitore
- Gestione HACCP e controlli sanitari
- Gestione di altri servizi scolastici (trasporto, pre/post scuola) — **ma** l'architettura deve consentirne l'aggiunta come moduli sullo stesso borsellino elettronico
- Contabilità finanziaria dell'Ente (si richiede integrazione, non sostituzione)

---

## 2. Contesto normativo e vincoli di conformità

Il fornitore deve dimostrare, in offerta, come la soluzione soddisfa ciascuno dei punti seguenti. Questi non sono requisiti negoziabili.

| Rif. | Vincolo | Impatto sulla soluzione |
|---|---|---|
| NV-01 | **CAD** (D.Lgs. 82/2005) art. 64 — identità digitale | Accesso cittadino esclusivamente con SPID e/o CIE (e CNS dove previsto). Vietata la registrazione con sola email/password per le famiglie. |
| NV-02 | **CAD art. 5** — pagamenti verso la PA | Tutti gli incassi devono transitare da **pagoPA**. La gestione a bonifico con registrazione manuale descritta nel prototipo v1.0 non è conforme e va dismessa. |
| NV-03 | **CAD art. 64-bis** — app IO | Notifiche e avvisi di pagamento resi disponibili su app IO, in aggiunta a email. |
| NV-04 | **Linee guida AgID** di design per i servizi digitali | Interfaccia cittadino conforme al Design System italiano (Bootstrap Italia o equivalente dimostrabile). |
| NV-05 | **L. 4/2004 (Stanca)**, EN 301 549, WCAG 2.1 AA | Accessibilità obbligatoria su tutte le interfacce pubbliche; dichiarazione di accessibilità pubblicata. |
| NV-06 | **GDPR** (UE 2016/679) e D.Lgs. 196/2003 | DPIA obbligatoria (trattamento su larga scala di dati di minori + dati art. 9). Nomina del fornitore a Responsabile del trattamento ex art. 28. |
| NV-07 | **GDPR art. 9** — categorie particolari | Allergie, intolleranze e prescrizioni dietetiche mediche sono dati sanitari: cifratura dedicata, accesso su base need-to-know, log di accesso. |
| NV-08 | **Qualificazione cloud ACN** | Infrastruttura e servizi SaaS/PaaS devono essere qualificati per la PA, con dati trattati in UE. Questo è il motivo principale per cui il prototipo Firebase non è promuovibile in produzione senza verifica puntuale. |
| NV-09 | **CAD art. 68-69** — riuso e open source | Valutazione preventiva di soluzioni già in riuso; il codice sviluppato su commessa è di proprietà dell'Ente e va rilasciato su Developers Italia salvo motivata eccezione. |
| NV-10 | **PDND / Interoperabilità** | Le integrazioni con basi dati pubbliche (es. ANPR per verifica nucleo familiare, INPS per ISEE) devono passare dalla Piattaforma Digitale Nazionale Dati. |
| NV-11 | **Conservazione documentale** | Documenti contabili e rendicontazioni soggetti a conservazione a norma presso il sistema dell'Ente. |
| NV-12 | **Misure minime di sicurezza ICT per le PA (AgID/ACN)** | Da recepire integralmente; vedi Parte B §12. |

> **Nota per il RUP:** l'obbligo pagoPA cambia sostanzialmente il modello rispetto al prototipo. Il flusso "bonifico → invio copia all'ufficio → registrazione manuale → aggiornamento saldo" va sostituito da "avviso di pagamento/pagamento spontaneo pagoPA → ricevuta telematica → accredito automatico sul borsellino". Va comunque previsto un **canale residuale per i pagamenti allo sportello/tabaccheria** (sempre pagoPA) per non escludere le famiglie senza strumenti digitali.

---

## 3. Attori, profili e personas

### 3.1 Matrice degli attori

| Attore | Profilo applicativo | Contesto d'uso reale | Dispositivo prevalente |
|---|---|---|---|
| **Genitore / tutore** | `FAMIGLIA` | Casa, in mobilità, spesso di sera; competenza digitale molto variabile | Smartphone |
| **Insegnante / educatrice** | `RILEVATORE` | In classe, ore 8:20–9:30, con 20+ bambini attorno, poco tempo, connettività a volte assente | Tablet o smartphone personale/di plesso |
| **Referente di plesso** | `REFERENTE_PLESSO` | Segreteria del plesso; verifica e chiude le rilevazioni della giornata | PC |
| **Operatore Ufficio Scuola** | `OPERATORE` | Back office; anagrafiche, tariffe, solleciti, assistenza famiglie | PC |
| **Responsabile del servizio / PO** | `SUPERVISORE` | Monitoraggio, report, autorizzazione ordini e note di credito | PC |
| **Ufficio Ragioneria** | `CONTABILE` | Riconciliazione incassi, reversali, rendicontazione | PC |
| **Fornitore / centro cottura** | `FORNITORE` (accesso limitato o solo notifiche) | Riceve la commessa giornaliera entro l'orario di cut-off | PC / email strutturata |
| **DPO e Amministratore di sistema** | `AUDITOR` / `ADMIN` | Verifica log, gestione utenze, nessun accesso operativo ai dati se non necessario | PC |
| **Sistema (job schedulati)** | — | Notifiche, solleciti, generazione commessa, riconciliazione | — |

### 3.2 Personas di riferimento (da usare come criterio di accettazione UX)

**Maestra Anna, 54 anni — il vincolo più stringente del progetto.**
Alle 8:25 ha 23 bambini che entrano in classe. Deve segnare chi mangia. Non ha tempo per login lunghi, non ha sempre campo, non vuole gestire password complesse, e se il sistema è lento torna al foglio di carta. **Se la parte "uso buoni" non funziona per lei, l'intero sistema fallisce**, perché tutta la catena contabile dipende dal suo dato.

**Sig.ra Karim, 38 anni, genitore.**
Usa lo smartphone, ha SPID. Vuole sapere quanto credito resta, ricaricare in due minuti senza andare in Comune, e ricevere un avviso *prima* di andare sotto zero, non dopo. Se il figlio ha un'allergia, vuole essere certa che a scuola lo sappiano.

**Marco, operatore Ufficio Scuola.**
Gestisce 1.200 alunni su 9 plessi. Passa metà del tempo a rispondere al telefono "quanto ho di credito?". Vuole che il sistema risponda al posto suo e che i numeri che manda in Ragioneria quadrino al centesimo.

---

## 4. Modello concettuale del servizio

### 4.1 Modello economico: borsellino elettronico prepagato
Si conferma il modello **prepagato** del prototipo, ma espresso in **valore monetario (€)** e non in "biglietti", perché:
- le tariffe sono differenziate per fascia ISEE, per ordine di scuola e per eventuali riduzioni (secondo figlio, esenzioni sociali);
- un modello a "buoni" a valore unico non è compatibile con tariffe multiple e con le variazioni tariffarie infra-anno;
- la rendicontazione contabile dell'Ente ragiona in euro.

Il "numero di pasti residui" resta **visualizzato** alla famiglia come dato derivato (credito ÷ tariffa corrente), perché è l'informazione che le famiglie comprendono meglio.

### 4.2 Il fatto generatore dell'addebito
L'addebito nasce dalla **presenza rilevata in classe**, non dall'azione dell'operatore né dal ritiro fisico di un buono. Sequenza logica:

```
Rilevazione presenza (insegnante)
        │
        ├──► Consolidamento giornaliero (cut-off orario, es. 09:30)
        │           │
        │           ├──► Addebito sul borsellino (movimento contabile tracciato)
        │           ├──► Notifica alla famiglia (opzionale, configurabile)
        │           └──► Commessa pasti al fornitore (aggregato per plesso/dieta)
        │
        └──► Finestra di rettifica (referente/operatore, con motivazione e audit)
```

### 4.3 Stati principali

**Posizione contabile alunno:** `ATTIVA` → `IN_ESAURIMENTO` (≤ soglia) → `ESAURITA` (credito ≤ 0) → `MOROSA` (credito negativo oltre tolleranza e oltre N giorni) → `SOSPESA` / `CESSATA`

**Rilevazione giornaliera di classe:** `DA_RILEVARE` → `IN_CORSO` → `CONFERMATA` → `CONSOLIDATA` (dopo cut-off, non più modificabile se non per rettifica tracciata) → `RETTIFICATA`

**Commessa fornitore:** `IN_PREPARAZIONE` → `INVIATA` → `PRESA_IN_CARICO` → `CHIUSA` / `ANNULLATA`

**Movimento contabile:** `AUTORIZZATO` → `CONTABILIZZATO` → `STORNATO` (mai cancellato: solo storno con contromovimento)

---

## 5. Requisiti funzionali

Legenda priorità: **M** = obbligatorio (must), **S** = importante (should), **C** = opzionale (could).

### 5.1 Modulo Anagrafiche e configurazione

| ID | Requisito | Pri. |
|---|---|---|
| RF-A01 | Gestione anno scolastico con apertura/chiusura, passaggio di classe massivo e archiviazione storica | M |
| RF-A02 | Anagrafica alunno: dati identificativi minimi, ordine di scuola, plesso, classe/sezione, stato iscrizione al servizio | M |
| RF-A03 | Anagrafica nucleo/pagatore con relazione N:N verso alunni (genitori separati, tutori, più figli) e indicazione del soggetto intestatario della posizione contabile | M |
| RF-A04 | Import iniziale anagrafiche da tracciato CSV/Excel con validazione, report errori e possibilità di rollback | M |
| RF-A05 | Verifica/allineamento dati anagrafici tramite ANPR via PDND, ove disponibile | S |
| RF-A06 | Gestione plessi, calendario scolastico, giorni di erogazione del servizio per plesso, festività e sospensioni | M |
| RF-A07 | Gestione tariffario: tariffe per ordine di scuola, fascia ISEE, riduzioni per fratelli, esenzioni; **validità temporale** delle tariffe (una modifica non deve alterare gli addebiti passati) | M |
| RF-A08 | Configurazione parametri di sistema da interfaccia amministrativa, **senza valori cablati nel codice** (soglie, orari di cut-off, testi delle comunicazioni, indirizzi fornitore) | M |
| RF-A09 | Gestione modelli di comunicazione con segnaposto, anteprima e versionamento dei testi | M |
| RF-A10 | Modalità "ambiente di prova" isolata (vedi RF-Z03), che **non può** coesistere con dati reali nello stesso ambiente | M |

### 5.2 Modulo Iscrizione al servizio

| ID | Requisito | Pri. |
|---|---|---|
| RF-B01 | Domanda di iscrizione online del genitore con autenticazione SPID/CIE e precompilazione dei dati noti | M |
| RF-B02 | Acquisizione attestazione ISEE (upload o recupero telematico) e attribuzione automatica della fascia tariffaria | M |
| RF-B03 | Dichiarazione di dieta speciale distinta in: **dieta sanitaria** (allergia/intolleranza, richiede certificato medico) e **dieta etico-religiosa** (autodichiarata) | M |
| RF-B04 | Workflow di approvazione della dieta sanitaria da parte dell'ufficio, con esito e validità temporale | M |
| RF-B05 | Gestione consensi e informative privacy, con registrazione di data, versione e canale | M |
| RF-B06 | Rinnovo/variazione iscrizione e disdetta del servizio con effetto da data | M |
| RF-B07 | Iscrizione assistita allo sportello da parte dell'operatore per l'utenza non digitale, con tracciatura dell'operatore | M |

### 5.3 Modulo Pagamenti e borsellino

| ID | Requisito | Pri. |
|---|---|---|
| RF-C01 | Ricarica online del borsellino via pagoPA (pagamento spontaneo), con importi liberi e importi suggeriti | M |
| RF-C02 | Generazione di avviso di pagamento pagoPA stampabile/scaricabile e disponibile su app IO per il pagamento presso PSP fisici | M |
| RF-C03 | Accredito automatico del credito alla ricezione della **ricevuta telematica**, non al momento dell'avvio del pagamento | M |
| RF-C04 | Riconciliazione automatica degli incassi con il flusso di rendicontazione pagoPA e quadratura giornaliera; segnalazione delle partite non riconciliate | M |
| RF-C05 | Estratto conto del borsellino consultabile dalla famiglia: ogni movimento con data, causale, importo, saldo progressivo | M |
| RF-C06 | Movimenti manuali di rettifica (accredito/storno) eseguibili solo da profilo autorizzato, con motivazione obbligatoria e doppio livello di autorizzazione oltre soglia configurabile | M |
| RF-C07 | Gestione rimborsi e trasferimento credito residuo tra fratelli o ad anno successivo, secondo regolamento dell'Ente | S |
| RF-C08 | Credito negativo ammesso entro tolleranza configurabile (il bambino **mangia comunque**: nessun blocco automatico della somministrazione) | M |
| RF-C09 | Processo di sollecito graduale: avviso soglia → sollecito → diffida, con generazione documentale e tracciatura degli invii | M |

> **Regola non negoziabile:** il sistema non deve mai impedire a un minore di ricevere il pasto per ragioni di credito. La gestione della morosità è un processo amministrativo separato e asincrono.

### 5.4 Modulo Rilevazione presenze — "uso buoni" (area critica)

Questo è il modulo su cui si gioca l'adozione del sistema. Requisiti pensati sul contesto reale della classe.

| ID | Requisito | Pri. |
|---|---|---|
| RF-D01 | Accesso dell'insegnante alla sola/e classe/i di competenza, con sessione ricordata sul dispositivo autorizzato per ridurre gli attriti di login | M |
| RF-D02 | Schermata unica per classe con elenco alunni e **stato predefinito già impostato** secondo la configurazione (di norma "presente a mensa"): l'insegnante deve solo deselezionare le eccezioni | M |
| RF-D03 | Registrazione dell'intera classe con una singola conferma finale; numero di interazioni proporzionale alle sole eccezioni | M |
| RF-D04 | Stati per alunno: `Presente a mensa`, `Assente`, `Presente ma non mangia`, `Pasto da sacco`, `Uscita anticipata`. Nessuno stato ambiguo | M |
| RF-D05 | **Funzionamento offline**: la rilevazione deve essere completabile senza rete e sincronizzata automaticamente al ripristino della connettività, con indicatore di stato chiaro e risoluzione dei conflitti deterministica | M |
| RF-D06 | Evidenza visiva **non stigmatizzante** delle diete speciali: icona per dieta sanitaria e per dieta etico-religiosa, dettaglio visibile solo su richiesta esplicita e loggato | M |
| RF-D07 | Riepilogo di conferma prima dell'invio ("Oggi mangiano 19 su 23 — 1 dieta senza glutine") e possibilità di annullare entro la finestra di rettifica | M |
| RF-D08 | Blocco delle modifiche dopo il cut-off, con richiesta di rettifica inoltrata al referente di plesso | M |
| RF-D09 | Promemoria automatico alle classi che non hanno rilevato entro l'orario previsto, e cruscotto di completamento per il referente di plesso | M |
| RF-D10 | Modalità di emergenza cartacea: stampa elenco classe precompilato e successivo inserimento massivo da parte del referente | S |
| RF-D11 | Interfaccia ottimizzata per touch: aree tattili ampie, testo leggibile, contrasto elevato, uso in piedi e con una sola mano | M |
| RF-D12 | Il modulo non deve mostrare all'insegnante il saldo, la morosità o dati economici della famiglia | M |

> **Criterio di accettazione UX (proposto):** un'insegnante non addestrata deve completare la rilevazione di una classe di 25 alunni con 3 eccezioni in **meno di 60 secondi**, al primo tentativo, con test su almeno 5 utenti reali in fase di collaudo.

### 5.5 Modulo Diete speciali e sicurezza alimentare

| ID | Requisito | Pri. |
|---|---|---|
| RF-E01 | Registro delle diete attive per plesso/classe, consultabile dal personale autorizzato al momento della somministrazione | M |
| RF-E02 | Trasmissione al fornitore del **dato aggregato per tipologia di dieta**, con identificazione nominativa limitata ai casi in cui è indispensabile per la sicurezza del bambino e previa valutazione con il DPO | M |
| RF-E03 | Notifica al fornitore e al plesso in caso di attivazione, variazione o cessazione di una dieta, con conferma di presa in carico | M |
| RF-E04 | Scadenza e rinnovo delle diete sanitarie legate a certificato medico | S |
| RF-E05 | Log di ogni accesso al dettaglio di una dieta sanitaria (chi, quando, per quale alunno) | M |

### 5.6 Modulo Commessa fornitore

| ID | Requisito | Pri. |
|---|---|---|
| RF-F01 | Generazione automatica della **commessa giornaliera** per plesso, con totali per tipologia di pasto e dieta, entro l'orario di cut-off configurato | M |
| RF-F02 | Invio della commessa al fornitore tramite canale strutturato (API o file su area sicura) con email di cortesia; ricevuta di presa in carico | M |
| RF-F03 | Riepilogo mensile dei pasti erogati per plesso, come base per il controllo della fattura del fornitore | M |
| RF-F04 | Confronto automatico tra pasti rilevati e pasti fatturati, con evidenza degli scostamenti | S |
| RF-F05 | Gestione di annullamenti e rettifiche della commessa entro finestre temporali definite contrattualmente | M |
| RF-F06 | Il sistema impedisce l'invio duplicato della stessa commessa e registra data, ora, mittente e destinatari di ogni invio | M |

### 5.7 Modulo Comunicazioni e notifiche

| ID | Requisito | Pri. |
|---|---|---|
| RF-G01 | Canali: app IO (preferenziale), email, area riservata; SMS solo per eventi critici e se previsto a budget | M |
| RF-G02 | Notifica di credito in esaurimento **a soglia configurabile e anti-duplicato**: un solo avviso per ciclo, riarmato automaticamente dopo la ricarica | M |
| RF-G03 | Notifica di addebito giornaliero disattivabile dalla famiglia (un messaggio al giorno per figlio è percepito come spam) — default consigliato: riepilogo settimanale | S |
| RF-G04 | Comunicazioni di servizio massive per plesso/classe (sospensione servizio, variazione menù) | S |
| RF-G05 | Registro di tutte le comunicazioni inviate per posizione, consultabile dall'operatore a supporto delle contestazioni | M |
| RF-G06 | Gestione dei bounce e degli indirizzi non validi, con segnalazione all'operatore | M |
| RF-G07 | Tutte le comunicazioni devono essere leggibili, prive di dati eccedenti e non devono contenere dati sanitari | M |

### 5.8 Modulo Area riservata famiglia

| ID | Requisito | Pri. |
|---|---|---|
| RF-H01 | Vista d'insieme dei figli con saldo, giorni di autonomia stimati e stato iscrizione | M |
| RF-H02 | Estratto conto e storico presenze consultabile e scaricabile | M |
| RF-H03 | Ricarica in massimo 3 passaggi dalla home | M |
| RF-H04 | Consultazione menù del giorno e del mese | S |
| RF-H05 | Segnalazione di assenza programmata da parte del genitore (utile a ridurre gli sprechi, se il regolamento lo prevede) | C |
| RF-H06 | Download delle attestazioni di spesa annuali per fini fiscali | S |
| RF-H07 | Gestione delle preferenze di notifica e dei recapiti | M |

### 5.9 Modulo Back office e reportistica

| ID | Requisito | Pri. |
|---|---|---|
| RF-I01 | Cruscotto operativo: rilevazioni mancanti, posizioni sotto soglia, morosità, anomalie di riconciliazione | M |
| RF-I02 | Ricerca rapida della posizione per nome, codice, classe, con vista unificata (anagrafica, saldo, movimenti, comunicazioni inviate) — pensata per l'operatore al telefono | M |
| RF-I03 | Report contabili: incassi per periodo, addebiti, credito residuo complessivo, insoluti | M |
| RF-I04 | Report statistici: pasti per plesso/classe/fascia, tasso di adesione, andamento diete | S |
| RF-I05 | Esportazione in formato aperto (CSV, ODS/XLSX) di ogni report | M |
| RF-I06 | Tracciato di esportazione verso il sistema di contabilità dell'Ente, concordato in fase di analisi di dettaglio | M |
| RF-I07 | Dati aperti aggregati e anonimizzati pubblicabili sul portale dell'Ente | C |

### 5.10 Modulo Amministrazione, sicurezza e audit

| ID | Requisito | Pri. |
|---|---|---|
| RF-Z01 | Gestione utenti e ruoli con principio del minimo privilegio; profili applicativi come da §3.1, personalizzabili | M |
| RF-Z02 | Log di audit **immutabile e consultabile** di tutte le operazioni rilevanti: accessi, modifiche anagrafiche, movimenti contabili, accessi a dati sanitari, invii massivi, modifiche di configurazione | M |
| RF-Z03 | Ambienti separati (sviluppo, test/collaudo, produzione) con dati di test **sintetici**: è vietato l'uso di dati reali di minori negli ambienti non di produzione | M |
| RF-Z04 | Nessun indirizzo, credenziale, chiave o segreto cablato nel codice o nei fogli di configurazione accessibili agli operatori | M |
| RF-Z05 | Funzione di cancellazione/anonimizzazione a fine periodo di conservazione, con evidenza documentale | M |
| RF-Z06 | Doppia conferma per le operazioni massive irreversibili (invii, addebiti massivi, chiusure d'anno) | M |

---

## 6. Regole di business

| ID | Regola | Origine |
|---|---|---|
| BR-01 | Il saldo è sempre un **dato derivato** dalla somma algebrica dei movimenti; non è mai un valore modificabile direttamente | Evoluzione di BR-04/BR-05 v1.0 |
| BR-02 | Nessun movimento contabile viene cancellato: le correzioni avvengono per storno con contromovimento e motivazione | Nuova |
| BR-03 | L'avviso di soglia è inviato una sola volta per ciclo; si riarma automaticamente quando il credito risale sopra soglia | BR-01/BR-02 v1.0 |
| BR-04 | Il credito insufficiente non blocca mai l'erogazione del pasto al minore | Nuova (tutela del minore) |
| BR-05 | L'addebito è generato dal consolidamento della rilevazione di classe dopo il cut-off, mai dall'inserimento manuale diretto di un operatore | Nuova |
| BR-06 | Le rettifiche post cut-off richiedono motivazione, autorizzazione di livello superiore e restano tracciate | Nuova |
| BR-07 | La tariffa applicata a un addebito è quella **vigente alla data del pasto**, non quella corrente | Nuova |
| BR-08 | La commessa giornaliera è inviata una sola volta per plesso e data; ogni variazione successiva è una rettifica esplicita e numerata | BR-08 v1.0 |
| BR-09 | I dati sanitari (diete) non compaiono mai in email, notifiche push, report aggregati o esportazioni non protette | NV-07 |
| BR-10 | L'insegnante vede solo i dati necessari alla somministrazione; nessun dato economico | Minimizzazione |
| BR-11 | Gli avvisi alla famiglia sono inviati esclusivamente ai recapiti verificati dell'intestatario della posizione | Nuova |
| BR-12 | Ogni comunicazione automatica ha un identificativo univoco riportato anche a video nell'estratto conto | Gestione contestazioni |

---

## 7. Casi d'uso principali

### UC-01 — Rilevazione presenze in classe (attore: Insegnante)
**Precondizione:** l'insegnante è autenticata sul dispositivo di plesso; la classe risulta `DA_RILEVARE`.
1. Apre l'app: la classe del giorno è già selezionata come ultima usata.
2. Vede l'elenco con tutti gli alunni preimpostati a "presente a mensa" e le icone di dieta.
3. Tocca i 2-3 bambini assenti o che non mangiano, scegliendo lo stato dalla lista breve.
4. Legge il riepilogo (totale pasti, totale diete) e conferma.
5. Riceve conferma visiva immediata; se offline, il dato è salvato localmente e marcato "in attesa di invio".

**Estensioni:** (3a) alunno non in elenco → segnalazione al referente, non inserimento libero. (5a) sincronizzazione fallita per oltre N minuti → avviso persistente sul dispositivo e alert al referente di plesso.
**Postcondizione:** rilevazione `CONFERMATA`; al cut-off diventa `CONSOLIDATA` e genera gli addebiti.

### UC-02 — Ricarica del borsellino (attore: Genitore)
1. Accede all'area riservata con SPID/CIE.
2. Seleziona il figlio e l'importo (suggeriti: 10 / 20 / 30 pasti equivalenti, o importo libero).
3. Viene reindirizzato a pagoPA e completa il pagamento.
4. Al ritorno vede lo stato "pagamento in elaborazione".
5. Alla ricezione della ricevuta telematica il credito è accreditato e la famiglia riceve conferma su IO/email.

**Estensioni:** (3a) abbandono del pagamento → nessun accredito, avviso pendente recuperabile. (5a) ricevuta non pervenuta entro X ore → la posizione entra nel cruscotto anomalie dell'operatore.

### UC-03 — Avviso di credito in esaurimento (attore: Sistema)
1. Job schedulato giornaliero valuta tutte le posizioni attive.
2. Per ogni posizione con credito ≤ soglia (assoluta o espressa in pasti residui) e senza avviso attivo nel ciclo corrente: compone e invia la comunicazione.
3. Registra invio, canale, esito e identificativo.
4. Se il credito risale sopra soglia, azzera il flag di ciclo.

### UC-04 — Generazione e invio commessa (attore: Sistema + Supervisore)
1. Al cut-off il sistema consolida le rilevazioni per plesso.
2. Se una o più classi non hanno rilevato, applica la policy configurata (es. proiezione sul dato storico) **segnalandolo esplicitamente** nella commessa e al referente.
3. Genera il documento di commessa e lo invia al fornitore.
4. Registra invio ed eventuale conferma di presa in carico.

### UC-05 — Gestione di una contestazione (attore: Operatore)
1. Cerca la posizione per cognome del bambino.
2. Apre la vista unificata: saldo, ultimi movimenti, presenze rilevate, comunicazioni inviate con data e ora.
3. Verifica il giorno contestato e chi ha effettuato la rilevazione.
4. Se necessario, dispone uno storno motivato (BR-02) che risulta immediatamente alla famiglia.

### UC-06 — Attivazione di una dieta sanitaria (attori: Genitore, Operatore, Fornitore)
1. Il genitore carica il certificato medico dall'area riservata.
2. L'ufficio valuta e approva, impostando decorrenza e scadenza.
3. Il sistema notifica plesso e fornitore e attende presa in carico.
4. L'icona dieta compare nella schermata di rilevazione dal giorno di decorrenza.

---

# PARTE B — ANALISI TECNICA

## 8. Principi architetturali richiesti

| ID | Principio |
|---|---|
| PA-01 | **Cloud-first su infrastruttura qualificata ACN**, dati in UE, con contratto che vieti trasferimenti extra-UE non conformi |
| PA-02 | **API-first**: ogni funzione del back office esposta via API documentata (OpenAPI 3.x); le interfacce sono client delle stesse API |
| PA-03 | **Separazione netta dei domini**: identità/accessi, anagrafiche, contabilità, rilevazione, comunicazioni, integrazioni. Modulare, non necessariamente a microservizi |
| PA-04 | **Contabilità append-only**: registro dei movimenti immutabile, saldo calcolato o materializzato con ricostruibilità |
| PA-05 | **Offline-first sul client di rilevazione**, con sincronizzazione idempotente |
| PA-06 | **Configurazione esternalizzata**, segreti in vault, nessun dato sensibile nei repository |
| PA-07 | **Portabilità**: nessun vincolo tecnologico che impedisca la migrazione a un altro fornitore o infrastruttura (exit strategy, §17) |
| PA-08 | **Osservabilità**: log applicativi, metriche e tracce centralizzate, con separazione tra log tecnici e log di audit |

## 9. Architettura logica di riferimento

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  App/PWA     │  Web         │  Back office │  Portale     │
│  Rilevazione │  Famiglia    │  Operatori   │  Fornitore   │
│  (offline)   │  (SPID/CIE)  │  (SSO Ente)  │  (limitato)  │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘
       └──────────────┴───── API Gateway ───────────┘
                             │  (authN/authZ, rate limit, WAF)
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
 ┌───────────┐        ┌─────────────┐       ┌──────────────┐
 │ Anagrafiche│       │ Contabilità │       │ Rilevazione  │
 │ e Iscrizioni│      │ e Borsellino│       │ Presenze     │
 └───────────┘        └─────────────┘       └──────────────┘
       │                     │                     │
       ▼                     ▼                     ▼
 ┌────────────┐      ┌──────────────┐      ┌──────────────┐
 │ Comunicaz. │      │ Integrazioni │      │ Audit & Log  │
 │ (IO/mail)  │      │ pagoPA/PDND  │      │ immutabile   │
 └────────────┘      └──────────────┘      └──────────────┘
       │                     │
       ▼                     ▼
  Base dati relazionale (PostgreSQL o equivalente) + Object storage cifrato
```

**Nota sullo stack:** il committente non impone un linguaggio o framework specifico. Le scelte devono essere motivate in offerta rispetto a: disponibilità di competenze sul mercato, maturità, licenze compatibili con il riuso, supporto a lungo termine, e assenza di lock-in proprietario. Il prototipo Angular + Firebase è una possibile base per il front end; **il back end basato su Firebase/Firestore non è assumibile in produzione senza dimostrazione puntuale di conformità a NV-08** (qualificazione ACN, localizzazione dati, condizioni contrattuali).

## 10. Modello dati (entità principali)

| Entità | Attributi chiave | Note |
|---|---|---|
| `AnnoScolastico` | codice, data inizio/fine, stato | Tutti i dati operativi sono partizionati per anno |
| `Plesso` | codice, denominazione, ordine scuola, calendario, orario cut-off | |
| `Classe` | plesso, anno, sezione, docenti abilitati | |
| `Alunno` | id interno, dati identificativi, classe, stato iscrizione | Codice fiscale solo se strettamente necessario e con base giuridica |
| `Pagatore` | id, dati identificativi, recapiti verificati, identità digitale | |
| `Relazione` | pagatore ↔ alunno, tipo, quota di responsabilità | Gestisce genitori separati |
| `PosizioneContabile` | intestatario, saldo materializzato, stato, tolleranza | Una per alunno o per nucleo, da decidere (§18) |
| `Movimento` | posizione, data, tipo (accredito/addebito/storno), importo, riferimento, operatore, causale | **Append-only** |
| `Tariffa` | ordine scuola, fascia, importo, validità da/a | Storicizzata |
| `Iscrizione` | alunno, anno, fascia ISEE, stato, consensi | |
| `DietaSpeciale` | alunno, tipo, dettaglio **cifrato**, decorrenza, scadenza, stato approvazione | Dati art. 9 GDPR |
| `RilevazioneGiornaliera` | classe, data, stato, rilevatore, ora conferma | |
| `PresenzaAlunno` | rilevazione, alunno, stato presenza, flag rettifica | Genera il movimento di addebito |
| `Commessa` | plesso, data, totali per dieta, stato, invii | |
| `Comunicazione` | destinatario, canale, modello, stato invio, identificativo | |
| `LogAudit` | timestamp, attore, azione, oggetto, esito, ip | Immutabile, conservazione separata |

**Vincoli di integrità richiesti:** unicità della rilevazione per (classe, data); impossibilità di generare due addebiti per (alunno, data, tipo pasto); coerenza tra somma movimenti e saldo verificata da job di quadratura giornaliero con alert in caso di scostamento.

## 11. Integrazioni

| Integrazione | Direzione | Criticità |
|---|---|---|
| **pagoPA** (pagamenti spontanei, avvisi, rendicontazione) | bidirezionale | Alta — vincolo normativo, richiede test di conformità con il partner tecnologico dell'Ente |
| **SPID / CIE** (SPID Aggregatore o IdP dell'Ente) | ingresso | Alta |
| **app IO** | uscita | Media |
| **SSO interno dell'Ente** per operatori | ingresso | Media |
| **PDND** (ANPR, eventualmente INPS/ISEE) | ingresso | Media — dipende dagli accordi dell'Ente |
| **Contabilità/bilancio dell'Ente** | uscita | Alta — tracciato da concordare in analisi di dettaglio |
| **Protocollo informatico** per diffide e atti | uscita | Media |
| **Fornitore refezione** (commessa, fatturazione) | uscita | Media — preferibile API o SFTP con file firmato; email solo come canale di cortesia |
| **Conservazione a norma** | uscita | Media |

Per ogni integrazione l'offerta deve indicare: protocollo, autenticazione, gestione degli errori, politica di retry, idempotenza, monitoraggio e comportamento del sistema in caso di indisponibilità del servizio esterno.

## 12. Requisiti di sicurezza

Approccio richiesto: **security by design**, con evidenze documentali prodotte lungo tutto il ciclo di vita, non solo a collaudo.

| ID | Requisito |
|---|---|
| RS-01 | Sviluppo secondo **OWASP ASVS** (livello 2 come riferimento minimo) e verifica sistematica sulle **OWASP Top 10**; mitigazione documentata delle CWE rilevanti (in particolare CWE-89, CWE-79, CWE-352, CWE-639/IDOR, CWE-798) |
| RS-02 | Autorizzazione verificata **lato server su ogni chiamata**, a livello di record: un genitore non deve poter accedere ai dati di un altro bambino alterando un identificativo. Uso di identificativi non enumerabili |
| RS-03 | Cifratura in transito (TLS 1.2+ con configurazione moderna) e at-rest; cifratura applicativa aggiuntiva per i campi contenenti dati sanitari, con chiavi gestite in KMS/HSM |
| RS-04 | Gestione dei segreti in vault; **nessuna credenziale, chiave API o token in repository, in fogli di calcolo o in file di configurazione distribuiti**. Rotazione periodica e rotazione immediata in caso di esposizione |
| RS-05 | MFA obbligatoria per profili amministrativi e per l'accesso all'infrastruttura |
| RS-06 | Log di audit su storage separato, a sola aggiunta, con integrità verificabile; conservazione secondo policy dell'Ente e regime specifico per i log degli amministratori di sistema (provvedimento Garante) |
| RS-07 | Hardening di sistemi e container, gestione patch con SLA per vulnerabilità critiche, scansione periodica |
| RS-08 | Pipeline CI/CD con **SAST, SCA su dipendenze, secret scanning e DAST**; build riproducibili; SBOM fornita all'Ente |
| RS-09 | **Vulnerability assessment e penetration test** da soggetto terzo prima del go-live e con cadenza almeno annuale; remediation plan con tempi contrattualizzati |
| RS-10 | Protezione perimetrale (WAF), rate limiting, protezione contro abusi sui form pubblici e sugli endpoint di autenticazione |
| RS-11 | Backup cifrati con test di ripristino documentato almeno semestrale; RPO e RTO dichiarati (valori proposti: RPO ≤ 1 h, RTO ≤ 4 h in orario di servizio — **da confermare** con l'Ente) |
| RS-12 | Piano di gestione degli incidenti con notifica all'Ente entro tempi contrattuali compatibili con l'obbligo di notifica al Garante entro 72 ore; coinvolgimento obbligatorio del DPO e del Responsabile SGSI |
| RS-13 | Segregazione degli ambienti e assenza di dati reali fuori produzione; procedura di anonimizzazione per la creazione dei dataset di test |
| RS-14 | Gestione del ciclo di vita delle utenze: provisioning, revisione periodica dei privilegi, deprovisioning immediato alla cessazione (particolarmente critico per il personale scolastico, che ha alto turnover) |
| RS-15 | Sicurezza dei dispositivi di rilevazione: cifratura del dato locale, blocco schermo, cancellazione remota se dispositivi dell'Ente; se BYOD, policy esplicita approvata e valutata nella DPIA |

> **Osservazione sul prototipo attuale:** l'uso di un indirizzo Gmail personale come destinatario di test e come recapito del fornitore, e l'inserimento di parametri operativi in celle di un foglio condiviso, sono pratiche da non replicare in produzione. Se in fase di prototipazione sono state inserite chiavi o credenziali in fogli, script o repository, se ne raccomanda la **rotazione immediata**.

## 13. Privacy e protezione dei dati

| ID | Requisito |
|---|---|
| RP-01 | **DPIA obbligatoria** prima dell'avvio: trattamento sistematico di dati di minori su larga scala con categorie particolari di dati. Da redigere a cura dell'Ente con il supporto tecnico del fornitore e la validazione del DPO |
| RP-02 | Individuazione e formalizzazione della base giuridica (esecuzione di un compito di interesse pubblico; per i dati sanitari, motivi di interesse pubblico rilevante / tutela della salute) |
| RP-03 | **Minimizzazione**: raccogliere solo i dati necessari. In particolare va valutata criticamente la necessità di data di nascita e codice fiscale nelle viste operative, e la necessità del dettaglio clinico rispetto alla sola indicazione operativa ("dieta senza glutine") |
| RP-04 | Nomina del fornitore a **Responsabile del trattamento ex art. 28** con atto giuridico completo, elenco dei sub-responsabili e autorizzazione preventiva alle sostituzioni |
| RP-05 | Registro dei trattamenti aggiornato; informative distinte e comprensibili per famiglie e personale |
| RP-06 | Tempi di conservazione definiti per categoria di dato, con cancellazione o anonimizzazione automatica a scadenza e prova dell'avvenuta esecuzione |
| RP-07 | Gestione dei diritti dell'interessato (accesso, rettifica, cancellazione ove applicabile) con funzioni applicative a supporto e tempi di risposta compatibili con l'art. 12 |
| RP-08 | **Nessuna profilazione, nessun uso secondario dei dati, nessun tracciamento pubblicitario, nessuna analitica di terze parti non conforme** sulle interfacce rivolte alle famiglie |
| RP-09 | Trasferimenti extra-UE esclusi salvo valutazione formale e garanzie adeguate documentate |
| RP-10 | Formazione periodica documentata per gli autorizzati al trattamento, in particolare per il personale scolastico che accede ai dati di dieta |

> Le presenti indicazioni sono un orientamento tecnico e **non sostituiscono la valutazione del DPO dell'Ente**, che va acquisita prima della pubblicazione degli atti di gara.

## 14. Analisi dei prototipi esistenti (gap analysis)

### 14.1 Prototipo A — Google Sheets + Apps Script
**Valore:** ha validato il flusso operativo, i testi delle comunicazioni, le soglie e le aspettative degli utenti. È un ottimo documento di requisiti travestito da applicazione.

**Perché non è promuovibile in produzione:**

| Ambito | Criticità |
|---|---|
| Sicurezza | Nessun controllo di accesso a livello di record: chiunque abbia il foglio vede tutti i dati di tutti i minori, comprese le note sulle allergie |
| Integrità | I saldi sono formule sovrascrivibili per errore; un `CERCA.VERT` disallineato produce addebiti sull'alunno sbagliato senza alcuna traccia |
| Auditabilità | La cronologia di Google Sheets non è un log di audit conforme |
| Conformità | Nessun SPID, nessun pagoPA, nessuna accessibilità, infrastruttura non qualificata per la PA |
| Operatività | Limiti di quota sull'invio email di Apps Script; nessuna gestione di bounce; nessun retry affidabile |
| Usabilità | Non utilizzabile in classe da un'insegnante su tablet; nessuna modalità offline |
| Continuità | Dipendenza da un account personale e da uno script non versionato |

### 14.2 Prototipo B — Angular + Firebase
**Valore:** dimostra separazione dei ruoli (admin/famiglia), regole di sicurezza testate, esecuzione locale su emulatori, seed di dati fittizi. Impostazione metodologicamente corretta.

**Punti da verificare prima di considerarlo una base:**
- Conformità infrastrutturale a NV-08 (qualificazione ACN, localizzazione dei dati, condizioni contrattuali del provider)
- Sostenibilità del modello dati documentale per una contabilità che richiede transazionalità, storni e quadratura: valutare un database relazionale per il dominio contabile
- Copertura effettiva delle regole di sicurezza a livello di singolo documento e di query
- Assenza di lock-in: astrazione dell'accesso ai dati e strategia di uscita
- Versione di runtime e dipendenze da aggiornare e mantenere nel tempo (già segnalato nel repository)

### 14.3 Raccomandazione
Non partire da zero e non promuovere il prototipo. **Riusare i prototipi come specifica eseguibile** e capitolato di riferimento per l'interfaccia, e realizzare la soluzione target su architettura conforme. In sede di gara, richiedere agli offerenti di dimostrare il modulo di rilevazione presenze su dispositivo reale (§16).

## 15. Requisiti non funzionali

| ID | Requisito | Valore proposto (da confermare) |
|---|---|---|
| RNF-01 | Disponibilità in orario di servizio (7:30–18:30 giorni scolastici) | ≥ 99,5% mensile |
| RNF-02 | Tempo di risposta delle funzioni interattive | ≤ 1 s al 90° percentile; ≤ 2,5 s al 99° |
| RNF-03 | Picco di carico gestito | Tutte le classi dell'Ente che rilevano tra le 8:15 e le 9:30 dello stesso giorno, con margine ×3 |
| RNF-04 | Funzionamento offline del modulo rilevazione | Fino a 24 h senza rete, con sincronizzazione automatica |
| RNF-05 | Accessibilità | WCAG 2.1 AA verificata con audit indipendente |
| RNF-06 | Compatibilità | Browser evergreen; dispositivi Android/iOS in supporto corrente, inclusi tablet di fascia bassa |
| RNF-07 | Multilingua | Italiano + almeno inglese; predisposizione per lingue dell'utenza straniera del territorio |
| RNF-08 | Scalabilità | Dimensionamento dichiarato per [N] alunni e [M] plessi, con capacità di crescita del 100% senza riprogettazione |
| RNF-09 | Manutenibilità | Copertura test automatici ≥ 70% sul dominio contabile e sulla rilevazione; documentazione tecnica aggiornata a ogni rilascio |
| RNF-10 | Internazionalizzazione dei formati | Date `gg/mm/aaaa`, importi in euro con separatore decimale italiano |

## 16. Collaudo e criteri di accettazione

Il collaudo non si limita alla verifica funzionale. Si richiedono le seguenti prove, con esito documentato:

| # | Prova | Criterio di superamento |
|---|---|---|
| CA-01 | Test funzionale su tutti i requisiti M | 100% superati |
| CA-02 | **Test di usabilità in campo sul modulo rilevazione** con almeno 5 insegnanti reali non addestrate | Attività completata senza assistenza; tempo mediano ≤ 60 s per classe |
| CA-03 | Test di usabilità sull'area famiglia con almeno 5 genitori, di cui 2 a bassa competenza digitale | Ricarica completata in autonomia |
| CA-04 | Audit di accessibilità indipendente | Nessuna non conformità bloccante WCAG 2.1 AA |
| CA-05 | Penetration test | Nessuna vulnerabilità critica o alta aperta al go-live |
| CA-06 | Test di carico sul picco mattutino | Rispetto di RNF-02 e RNF-03 |
| CA-07 | Prova di disaster recovery | Ripristino entro RTO dichiarato, con dati integri |
| CA-08 | Test di riconciliazione pagoPA su ciclo completo | Quadratura al centesimo su un campione di almeno 100 transazioni |
| CA-09 | Prova di funzionamento offline e risoluzione conflitti | Nessuna perdita e nessuna duplicazione di rilevazioni |
| CA-10 | Verifica della migrazione dati dal sistema attuale | Quadratura dei saldi di apertura al centesimo, con report delle eccezioni |

## 17. Servizio, governance e uscita

### 17.1 Fasi proposte

| Fase | Contenuto | Deliverable |
|---|---|---|
| F0 — Analisi di dettaglio | Interviste, workshop con insegnanti e operatori, specifica di dettaglio, DPIA | Documento di analisi approvato, DPIA, piano di progetto |
| F1 — Design | Prototipo navigabile, test di usabilità preliminari, architettura tecnica | Prototipo validato, documento di architettura |
| F2 — Realizzazione MVP | Anagrafiche, rilevazione, borsellino, pagoPA, notifiche base | Software in ambiente di collaudo |
| F3 — Pilota | Avvio su 1-2 plessi in parallelo al sistema attuale | Report di pilota e correzioni |
| F4 — Estensione | Roll-out su tutti i plessi, migrazione dati, formazione | Verbale di collaudo |
| F5 — Esercizio | Manutenzione correttiva, adeguativa, evolutiva a consumo | Report periodici di servizio |

> Si raccomanda di **non far coincidere il go-live con l'inizio dell'anno scolastico**: il periodo di massimo stress operativo non è il momento giusto per un cambio di sistema. Avvio del pilota preferibilmente a gennaio, estensione a settembre successivo.

### 17.2 Livelli di servizio (proposta base, da contrattualizzare)

| Severità | Definizione | Presa in carico | Ripristino |
|---|---|---|---|
| S1 — Bloccante | Impossibile rilevare presenze o incassare | 1 h lavorativa | 4 h |
| S2 — Grave | Funzione importante degradata, workaround esistente | 4 h | 2 gg lav. |
| S3 — Ordinario | Anomalia non bloccante | 1 g lav. | 10 gg lav. |
| S4 — Richiesta | Assistenza, configurazione | 2 gg lav. | concordato |

Presidio richiesto negli orari di servizio; canale dedicato per il personale scolastico distinto da quello per le famiglie.

### 17.3 Formazione e documentazione
- Formazione differenziata per profilo, con materiale specifico e **molto breve** per le insegnanti (guida di una pagina, video di 2 minuti)
- Manuale operatore, manuale amministratore, documentazione tecnica e di deployment
- Sessioni di affiancamento nei primi giorni di ogni plesso

### 17.4 Proprietà e strategia di uscita (clausole da inserire in contratto)
| ID | Clausola |
|---|---|
| EX-01 | I dati sono e restano di titolarità dell'Ente; il fornitore non può usarli per finalità proprie |
| EX-02 | Esportazione completa dei dati in formato aperto e documentato, disponibile **in autonomia e in qualsiasi momento**, non solo a fine contratto |
| EX-03 | Proprietà del codice sviluppato su commessa in capo all'Ente, con rilascio in open source ove previsto dal CAD |
| EX-04 | Consegna di documentazione, schema dati, procedure di deploy e SBOM |
| EX-05 | Servizio di reversibilità assistita a fine contratto, con durata e corrispettivo predefiniti |
| EX-06 | Deposito o accesso garantito al codice sorgente in caso di cessazione del fornitore |

## 18. Punti aperti — decisioni richieste al committente

Da sciogliere prima della pubblicazione degli atti. Ognuno ha impatto su costo e architettura.

| # | Decisione | Impatto |
|---|---|---|
| Q-01 | Posizione contabile **per alunno** o **per nucleo familiare**? | Modello dati, UX famiglia, gestione rimborsi |
| Q-02 | Tariffa unica o differenziata per fascia ISEE ed esenzioni? Esiste già un regolamento comunale? | Modulo tariffario, integrazione ISEE |
| Q-03 | I dispositivi di rilevazione sono forniti dall'Ente o BYOD delle insegnanti? | Sicurezza, DPIA, costi, accettazione sindacale |
| Q-04 | Chi ha titolarità sul personale scolastico: l'Ente o l'Istituto Comprensivo? Serve un accordo/convenzione? | Ruoli privacy, nomine, accessi |
| Q-05 | Orario di cut-off e regole di gestione delle classi che non rilevano | Automazioni, rapporti con il fornitore |
| Q-06 | Politica su credito negativo: tolleranza, tempi di sollecito, soglia di avvio recupero | Regole di business, contenzioso |
| Q-07 | Notifica di addebito giornaliero: attiva di default o su richiesta? | Volumi di notifica, percezione del servizio |
| Q-08 | Il fornitore riceve un portale o solo la commessa? | Ambito, sicurezza, costi |
| Q-09 | Il sistema deve gestire anche altri servizi (trasporto, pre/post scuola) da subito o solo in prospettiva? | Dimensionamento e modularità |
| Q-10 | Perimetro numerico reale: alunni, plessi, classi, pasti/anno | Dimensionamento, base d'asta |
| Q-11 | Infrastruttura: SaaS del fornitore qualificato, PSN, o cloud dell'Ente? | Architettura, costi ricorrenti, conformità |
| Q-12 | Sistema contabile dell'Ente e partner tecnologico pagoPA in uso | Integrazioni |

## 19. Rischi principali e mitigazioni

| ID | Rischio | Impatto | Mitigazione |
|---|---|---|---|
| R-01 | Le insegnanti non adottano il modulo di rilevazione e tornano alla carta | Molto alto: fa collassare l'intera catena dati | Coinvolgerle nel design fin da F0; criterio di accettazione CA-02 vincolante; modalità offline; formazione minima |
| R-02 | Data breach su dati di minori e dati sanitari | Molto alto | §12 e §13 integralmente; DPIA; pen test; cifratura dedicata; minimizzazione |
| R-03 | Mancata quadratura contabile con pagoPA e con il fornitore | Alto | Registro append-only, job di quadratura, cruscotto anomalie, CA-08 |
| R-04 | Esclusione digitale delle famiglie fragili | Alto (anche reputazionale) | Canale sportello sempre attivo, avvisi cartacei su richiesta, multilingua, accessibilità |
| R-05 | Ritardi sulle integrazioni pagoPA/SPID per dipendenze da terzi | Medio-alto | Avvio anticipato delle attività di integrazione in F1; referenti dell'Ente individuati |
| R-06 | Lock-in sul fornitore o sull'infrastruttura | Medio | Clausole EX-01..06, API-first, formati aperti |
| R-07 | Dati di migrazione sporchi o incompleti dal sistema attuale | Medio | Bonifica anticipata, saldi di apertura firmati dal responsabile, CA-10 |
| R-08 | Errata classificazione dei dati sulle allergie come dati comuni | Alto | Trattamento come art. 9 fin dal design; validazione DPO |
| R-09 | Turnover del personale scolastico con utenze non revocate | Medio | RS-14, revisione periodica delle utenze |

## 20. Glossario

| Termine | Significato |
|---|---|
| **Borsellino elettronico** | Conto prepagato in euro associato alla posizione dell'alunno o del nucleo |
| **Cut-off** | Orario limite oltre il quale le rilevazioni sono consolidate e generano addebiti e commessa |
| **Commessa** | Comunicazione al fornitore del numero di pasti da produrre per plesso e tipologia |
| **Consolidamento** | Passaggio della rilevazione allo stato definitivo, con generazione dei movimenti |
| **DPIA** | Valutazione d'impatto sulla protezione dei dati (art. 35 GDPR) |
| **PDND** | Piattaforma Digitale Nazionale Dati, per l'interoperabilità tra PA |
| **Posizione contabile** | Insieme di saldo e movimenti riferiti a un alunno o a un nucleo |
| **Rilevazione** | Registrazione giornaliera, per classe, di chi consuma il pasto |
| **RT** | Ricevuta telematica pagoPA, unico evento che autorizza l'accredito del credito |
| **SBOM** | Distinta dei componenti software e delle dipendenze |
| **Storno** | Movimento di segno opposto che annulla contabilmente un movimento errato senza cancellarlo |

---

*Documento predisposto come base per il confronto con operatori economici. Da sottoporre a validazione di RUP, DPO, Responsabile SGSI e Servizio Finanziario prima di qualsiasi utilizzo in procedura di affidamento.*
