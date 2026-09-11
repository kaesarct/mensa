# 🍔 Analisi Funzionale — Sistema Gestione Mensa Scolastica

> **Versione:** 1.0  
> **Data:** Settembre 2026  
> **Piattaforma:** Google Sheets + Google Apps Script  
> **Responsabile:** Gianpiero Torrisi
> **Email di test:** faroclaudio@gmail.com  

---

## 1. Scopo del Sistema

Il sistema ha l'obiettivo di gestire digitalmente il servizio di mensa scolastica tramite un foglio di calcolo Google Sheets automatizzato. Consente di:

- Tenere traccia dei buoni pasto acquistati e utilizzati da ogni alunno/famiglia.
- Inviare automaticamente notifiche email alle famiglie quando i biglietti stanno per esaurirsi.
- Notificare le famiglie in tempo reale ogni volta che viene utilizzato un buono.
- Generare e inviare via email l'ordine mensile dei pasti al fornitore del servizio.
- Offrire all'operatore scolastico una dashboard di controllo chiara e immediata.

---

## 2. Attori del Sistema

| Attore | Ruolo |
|---|---|
| **Operatore scolastico** | Inserisce i dati delle ricariche, registra i buoni usati giornalmente, invia gli ordini al fornitore, gestisce le impostazioni |
| **Famiglia/Genitore** | Riceve notifiche email automatiche (avviso soglia, buono usato) |
| **Fornitore mensa** | Riceve l'ordine mensile dei pasti via email |
| **Sistema (Apps Script)** | Invia le email automaticamente, aggiorna gli status, gestisce i trigger giornalieri |

---

## 3. Flusso Operativo Principale

```
┌─────────────────────────────────────────────────────────────┐
│  ACQUISTO CREDITO                                           │
│  1. La famiglia esegue un bonifico                          │
│  2. Invia copia all'Ufficio scolastico                      │
│  3. L'operatore registra la ricarica nel "Log Ricariche"    │
│     (ID alunno, data, importo biglietti, link documento)    │
│  4. Il saldo si aggiorna automaticamente in "Alunni"        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  UTILIZZO CREDITO (giornaliero)                             │
│  1. La scuola registra i buoni usati nel "Log Utilizzi"     │
│     (ID alunno, data, numero buoni, classe/sezione)         │
│  2. Il saldo residuo si aggiorna automaticamente            │
│  3. Lo script invia notifica email alla famiglia:           │
│     "Buono usato — rimangono X biglietti"                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  AVVISO SOGLIA MINIMA                                       │
│  1. Lo script gira ogni giorno alle 18:00 (automatico)      │
│     OPPURE viene avviato manualmente dall'operatore         │
│  2. Identifica tutte le famiglie con biglietti ≤ 5          │
│  3. Controlla che non sia già stato inviato un avviso       │
│  4. Invia l'email di avviso alla famiglia                   │
│  5. Scrive la data di invio nella colonna "Status Avviso"   │
│  6. Se la famiglia ricarica e torna sopra soglia,           │
│     lo Status viene azzerato automaticamente                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ORDINE MENSILE AL FORNITORE                                │
│  1. L'operatore apre il foglio "Ordine Mensa"               │
│  2. Verifica il totale pasti (calcolato dal Log Utilizzi)   │
│  3. Preme il pulsante "Invia Ordine al Fornitore"           │
│  4. Lo script invia email al fornitore con il riepilogo     │
│  5. Aggiorna il campo "Data Invio Ordine" e "Stato Ordine"  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Struttura dei Fogli Google Sheets

### 4.1 Foglio `Dashboard` *(primo foglio, sempre visibile)*
Pagina di sintesi a colpo d'occhio. Senza griglia, stile applicazione web.

| KPI | Formula |
|---|---|
| Alunni Totali | `CONTA.VALORI(Alunni!B:B)-1` |
| Sotto Soglia | `CONTA.SE(Alunni!I:I,"<="&Impostazioni!B1)` |
| Avvisi Inviati (mese) | `CONTA.SE(Famiglie!G:G,"Inviato*")` |
| Buoni Usati (totale) | `SOMMA('Log Utilizzi'!C:C)` |

Contiene anche: tabella dinamica degli alunni che necessitano ricarica urgente (biglietti ≤ 5).

---

### 4.2 Foglio `Alunni` *(database principale)*
Contiene l'anagrafica completa di ogni alunno e il suo saldo biglietti.

| Colonna | Tipo | Note |
|---|---|---|
| YEP! | Testo | Indicatore visivo (logo) |
| Nome | Testo | Inserimento manuale |
| Cognome | Testo | Inserimento manuale |
| Data di Nascita | Data | Inserimento manuale |
| ID | Numerico | Identificatore univoco della famiglia/alunno |
| Biglietti Acquistati | **Formula** | `SOMMA.SE('Log Ricariche'!B:B, ID, 'Log Ricariche'!C:C)` — NON modificare manualmente |
| Utilizza Biglietto | Pulsante | Trigger manuale per scalare un buono (via Apps Script) |
| Totale Biglietti Utilizzati | **Formula** | `SOMMA.SE('Log Utilizzi'!B:B, ID, 'Log Utilizzi'!C:C)` |
| Totale Biglietti Rimanenti | **Formula** | `Acquistati - Utilizzati` |
| Status Biglietti | **Formula** | "Sufficienti" / "Inviare Avviso" / "ESAURITO" |
| Email Notifica | Testo | Inserimento manuale — usata dallo script per le notifiche |
| Avvisa / Cancella Avviso | Pulsante | Trigger manuale per invio email (via Apps Script) |
| Note | Testo | Allergie, note speciali (es. "Allergia a Licis") |
| Documenti/Bonifici | Link | Link a Google Drive del documento del bonifico |
| Check Avviso | Numerico | Flag interno per tracciare lo stato dell'avviso |

**Formattazione Condizionale — colonna "Biglietti Rimanenti":**
- 🟥 `≤ 0` → Sfondo rosso intenso, testo bianco ("ESAURITO!")
- 🟧 `≤ 5 e > 0` → Sfondo rosso tenue, testo rosso scuro
- 🟩 `> 5` → Sfondo verde tenue, testo verde scuro

**Colonne protette (solo lettura):** Biglietti Acquistati, Totale Utilizzati, Totale Rimanenti

---

### 4.3 Foglio `Famiglie` *(riepilogo account per ID)*
Vista aggregata per famiglia (un genitore può avere più figli). È il foglio che lo script legge per inviare gli avvisi.

| Colonna | Tipo | Note |
|---|---|---|
| ID | Numerico | Chiave di collegamento con Alunni |
| Nome | **Formula** | `CERCA.VERT(ID, Alunni!E:B, 2, 0)` |
| Cognome | **Formula** | `CERCA.VERT(ID, Alunni!E:C, 3, 0)` |
| Biglietti Acquistati | **Formula** | Collegata ad Alunni tramite CERCA.VERT |
| Totale Biglietti Utilizzati | **Formula** | Collegata ad Alunni tramite CERCA.VERT |
| Totale Biglietti Rimanenti | **Formula** | Collegata ad Alunni tramite CERCA.VERT |
| Status Biglietti | **Formula** | Collegata ad Alunni tramite CERCA.VERT |
| Email Notifica | Testo | Email della famiglia |
| Status Avviso | Testo | Scritto dallo script: `"Inviato il GG/MM/AAAA"` — Si azzera quando i biglietti tornano sopra soglia |

---

### 4.4 Foglio `Log Ricariche` *(inserimento manuale operatore)*
Traccia storica di tutte le ricariche eseguite. Ogni riga = un bonifico ricevuto.

| Colonna | Tipo | Note |
|---|---|---|
| Data Ricarica | Data | Inserimento manuale `GG/MM/AAAA` |
| ID Alunno | Numerico | Inserimento manuale — chiave verso foglio Alunni |
| Importo (biglietti) | Numerico | Numero di buoni aggiunti |
| Nome | **Formula** | `CERCA.VERT(ID, Alunni!E:B, 2, 0)` — auto-compilato |
| Cognome | **Formula** | `CERCA.VERT(ID, Alunni!E:C, 3, 0)` — auto-compilato |
| Riferimento Bonifico | Testo | CRO o causale del bonifico |
| Link Documento Drive | Link | Link al PDF del bonifico caricato su Drive |
| Operatore | Testo | Chi ha registrato la ricarica |

> ⚠️ **Logica di ricarica:** la colonna "Biglietti Acquistati" nel foglio Alunni NON viene modificata manualmente. È sempre il risultato di `SOMMA.SE` su questo log. Inserire una nuova riga qui è sufficiente per aggiornare tutto il sistema.

---

### 4.5 Foglio `Log Utilizzi` *(inserimento manuale giornaliero)*
Traccia storica di tutti i buoni utilizzati. Ogni riga = un utilizzo di pasto.

| Colonna | Tipo | Note |
|---|---|---|
| Data Utilizzo | Data | Inserimento manuale `GG/MM/AAAA` |
| ID Alunno | Numerico | Inserimento manuale |
| Buoni Usati (numero) | Numerico | Di solito 1 per ogni pasto |
| Nome | **Formula** | Auto-compilato |
| Cognome | **Formula** | Auto-compilato |
| Classe/Sezione | Testo | Es. "1A", "2B" |
| Note | Testo | Note particolari |

---

### 4.6 Foglio `Ordine Mensa` *(modulo di invio al fornitore)*
Modulo visivo (stile fattura) per la generazione dell'ordine mensile.

| Campo | Tipo | Note |
|---|---|---|
| Mese di Riferimento | Testo | Inserimento manuale operatore |
| Anno | Numerico | Inserimento manuale operatore |
| Numero Pasti Richiesti | **Formula** | `CONTA.SE('Log Utilizzi'!B:B,"<>")` — calcolato dal log |
| Email Fornitore | **Formula** | `=Impostazioni!B8` |
| Data Invio Ordine | Testo | Compilato dallo script al momento dell'invio |
| Stato Ordine | Testo | Compilato dallo script ("Inviato il GG/MM/AAAA") |

---

### 4.7 Foglio `Impostazioni` *(pannello di controllo)*
Tutte le variabili configurabili del sistema in un unico posto. Nessuna variabile è hardcodata nel codice.

| Parametro | Valore | Note |
|---|---|---|
| Soglia Minima | `5` | Numero biglietti rimanenti che attiva l'avviso |
| Test Mode | `ON` / `OFF` | **ON** = email solo alle email di test. **OFF** = email alle famiglie reali |
| Email Test | `faroclaudio@gmail.com` | Lista di email separate da virgola per i test |
| Oggetto Email Avviso | `Avviso: Credito Mensa in esaurimento` | Oggetto dell'email di soglia |
| Testo Email Avviso | `Attenzione: il conto mensa con ID [ID] - [NOME] [COGNOME] ha raggiunto la soglia minima di [BIGLIETTI] buoni. Si prega di ricaricare indicando l'IBAN. Cordiali Saluti.` | Segnaposto: `[ID]`, `[NOME]`, `[COGNOME]`, `[BIGLIETTI]` |
| Testo Email Buono Usato | `Sul conto mensa con ID [ID] - [NOME] [COGNOME] è stato utilizzato un buono pasto. Rimangono [RIMANENTI] biglietti.` | Segnaposto: `[ID]`, `[NOME]`, `[COGNOME]`, `[RIMANENTI]` |
| Testo Email Ordine Fornitore | `Si prega di procedere con numero [PASTI] pasti da fornire per il mese di [MESE] [ANNO]. Cordiali Saluti.` | Segnaposto: `[PASTI]`, `[MESE]`, `[ANNO]` |
| Email Fornitore | `faroclaudio@gmail.com` | Email del fornitore del servizio mensa |

---

## 5. Automazioni Google Apps Script

### 5.1 Funzione: `controllaSoglieEInviaAvvisi()`
**Trigger:** Automatico ogni giorno alle 18:00 + Manuale da menu "🍔 Gestione Mensa"

**Logica:**
1. Legge le impostazioni dal foglio `Impostazioni`.
2. Legge tutte le righe del foglio `Famiglie`.
3. Per ogni famiglia con `Biglietti Rimanenti ≤ Soglia Minima`:
   - Verifica che lo `Status Avviso` non contenga già "Inviato il..." (evita doppioni).
   - Se Test Mode = ON → invia a tutte le email del campo "Email Test".
   - Se Test Mode = OFF → invia alla vera email della famiglia.
   - Oggetto email: se Test Mode ON, aggiunge il prefisso `[TEST]`.
   - Sostituisce i segnaposto `[ID]`, `[NOME]`, `[COGNOME]`, `[BIGLIETTI]` con i valori reali.
   - Scrive `"Inviato il GG/MM/AAAA"` nella colonna `Status Avviso`.
4. Se una famiglia ha ricaricato e i biglietti tornano `> Soglia`, azzera lo `Status Avviso`.
5. Mostra un toast finale: "Elaborazione completata. Email inviate: N".

---

### 5.2 Funzione: `inviaNotificaBuonoUsato(idAlunno)`
**Trigger:** Manuale (pulsante "Utilizza Biglietto" nel foglio Alunni) o richiamata dopo inserimento nel Log Utilizzi.

**Logica:**
1. Legge i dati dell'alunno tramite l'ID.
2. Calcola i biglietti rimanenti aggiornati.
3. Invia email con il testo personalizzato dalla cella `Impostazioni!B6`.
4. Sostituisce `[ID]`, `[NOME]`, `[COGNOME]`, `[RIMANENTI]`.

---

### 5.3 Funzione: `inviaOrdineFornitore()`
**Trigger:** Manuale (pulsante nel foglio "Ordine Mensa")

**Logica:**
1. Legge i dati dal foglio `Ordine Mensa` (Mese, Anno, Numero Pasti).
2. Legge l'email fornitore da `Impostazioni!B8`.
3. Compone l'email con il testo da `Impostazioni!B7`.
4. Sostituisce `[PASTI]`, `[MESE]`, `[ANNO]`.
5. Se Test Mode = ON → invia alle email di test.
6. Scrive la data e lo stato nel foglio Ordine Mensa.

---

### 5.4 Funzione: `installaTriggerGiornaliero()`
**Trigger:** Manuale da menu (una sola volta in fase di setup)

**Logica:**
1. Controlla se esiste già un trigger per `controllaSoglieEInviaAvvisi`.
2. Se non esiste, lo crea con cadenza giornaliera alle 18:00.
3. Mostra conferma all'utente.

---

### 5.5 Funzione: `onOpen()`
**Trigger:** Automatico all'apertura del file

**Logica:**  
Crea il menu personalizzato "🍔 Gestione Mensa" con le voci:
- 📩 Invia Avvisi Soglia Minima
- 📦 Invia Ordine al Fornitore
- ⚙️ Configura Automazione Giornaliera

---

## 6. Messaggi Email del Sistema

### Email 1 — Avviso Soglia Minima
```
OGGETTO: [TEST] Avviso: Credito Mensa in esaurimento

Attenzione: il conto mensa con ID 6524939 - Mario Rossi 
ha raggiunto la soglia minima di 3 buoni. 
Si prega di ricaricare indicando l'IBAN. 
Cordiali Saluti.
```

### Email 2 — Notifica Buono Usato
```
OGGETTO: Notifica utilizzo buono mensa

Sul conto mensa con ID 6524939 - Mario Rossi 
è stato utilizzato un buono pasto. 
Rimangono 3 biglietti.
```

### Email 3 — Ordine Fornitore
```
OGGETTO: Ordine Pasti Mensile — Settembre 2026

Si prega di procedere con numero 87 pasti 
da fornire per il mese di Settembre 2026. 
Cordiali Saluti.
```

---

## 7. Regole di Business

| # | Regola |
|---|---|
| BR-01 | Lo script non invia email doppie: se `Status Avviso` contiene già "Inviato il...", la famiglia viene saltata |
| BR-02 | Lo `Status Avviso` si azzera automaticamente quando i biglietti tornano sopra soglia (es. dopo una ricarica) |
| BR-03 | In Test Mode = ON, TUTTE le email vanno esclusivamente alle email di test, MAI alle famiglie reali |
| BR-04 | I Biglietti Acquistati sono SEMPRE calcolati tramite formula dal Log Ricariche — mai inseriti a mano |
| BR-05 | I Biglietti Utilizzati sono SEMPRE calcolati tramite formula dal Log Utilizzi — mai inseriti a mano |
| BR-06 | Prima di andare in produzione, impostare Test Mode = OFF nel foglio Impostazioni |
| BR-07 | L'operatore inserisce una riga nel Log Ricariche per ogni bonifico ricevuto, allegando il link al documento Drive |
| BR-08 | L'ordine fornitore può essere inviato una sola volta per mese (lo script verifica "Stato Ordine" prima di procedere) |

---

## 8. Setup Iniziale (Guida Operatore)

1. **Importa il file Excel su Google Drive** → Aprilo come Google Sheets.
2. **Verifica la struttura dei fogli** secondo questa analisi.
3. **Apri Estensioni > Apps Script** e incolla il codice fornito. Salva.
4. **Ricarica il file** → comparirà il menu "🍔 Gestione Mensa".
5. **La prima volta**, cliccando una voce del menu Google chiederà l'autorizzazione: clicca Continua → scegli il tuo account → Avanzate → "Vai a Progetto" → Consenti.
6. **Verifica Test Mode = ON** nel foglio Impostazioni.
7. **Lancia "Invia Avvisi Soglia Minima"** → controlla che arrivi una email di test a `faroclaudio@gmail.com`.
8. **Clicca "Configura Automazione Giornaliera"** per attivare il controllo automatico alle 18:00.
9. **Solo quando tutto è verificato**, imposta Test Mode = **OFF** per iniziare a inviare email reali alle famiglie.

---

## 9. Ordine e Colori dei Fogli

| Posizione | Foglio | Colore Tab |
|---|---|---|
| 1° | Dashboard | 🔵 Blu scuro |
| 2° | Alunni | 🟢 Verde |
| 3° | Famiglie | 🩵 Turchese |
| 4° | Log Ricariche | 🟡 Giallo |
| 5° | Log Utilizzi | 🟠 Arancione |
| 6° | Ordine Mensa | 🟣 Viola |
| 7° | Impostazioni | ⚪ Grigio |

---

*Documento generato in collaborazione con Antigravity AI — Settembre 2026*
