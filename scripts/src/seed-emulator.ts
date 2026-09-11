/**
 * Popola l'emulatore Firebase (Auth + Firestore) con dati fittizi per test
 * manuali locali. Non tocca mai un progetto Firebase reale: richiede che
 * FIRESTORE_EMULATOR_HOST e FIREBASE_AUTH_EMULATOR_HOST puntino all'emulatore
 * (impostati di default qui sotto se non già presenti nell'ambiente).
 */
process.env.FIRESTORE_EMULATOR_HOST ??= 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= 'localhost:9099';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const app = initializeApp({ projectId: 'demo-mensa' });
const auth = getAuth(app);
const db = getFirestore(app);

async function upsertUser(email: string, claims: Record<string, unknown>): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(existing.uid, claims);
    return existing.uid;
  } catch {
    const created = await auth.createUser({ email, password: 'password123', emailVerified: true });
    await auth.setCustomUserClaims(created.uid, claims);
    return created.uid;
  }
}

async function seed(): Promise<void> {
  const operatorUid = await upsertUser('operatore@esempio.it', { role: 'admin' });
  await upsertUser('famiglia@esempio.it', { role: 'famiglia', familyId: 'F-0001' });

  await db.collection('families').doc('F-0001').set({
    cognome: 'Rossi',
    emails: ['famiglia@esempio.it'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  await db.collection('students').doc('S-0001').set({
    familyId: 'F-0001',
    nome: 'Mario',
    cognome: 'Rossi',
    dataNascita: Timestamp.fromDate(new Date('2016-04-12')),
    classe: '3',
    sezione: 'A',
    note: '',
    status: 'attivo',
    ticketsPurchased: 10,
    ticketsUsed: 7,
    ticketsRemaining: 3,
    ticketStatus: 'sotto_soglia',
    lastAlertSentAt: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  await db.collection('students').doc('S-0002').set({
    familyId: 'F-0001',
    nome: 'Anna',
    cognome: 'Rossi',
    dataNascita: Timestamp.fromDate(new Date('2018-09-03')),
    classe: '1',
    sezione: 'B',
    note: '',
    status: 'attivo',
    ticketsPurchased: 20,
    ticketsUsed: 5,
    ticketsRemaining: 15,
    ticketStatus: 'sufficienti',
    lastAlertSentAt: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // Log coerenti con i saldi denormalizzati sopra, per testare la verifica
  // via aggregation query (Opzione B, piano §3) senza discrepanze.
  await db.collection('topUps').doc('T-0001').set({
    studentId: 'S-0001', familyId: 'F-0001', amount: 10, bonificoRef: 'CRO-TEST-001',
    documentPath: null, operatorUid: operatorUid, date: Timestamp.now(), createdAt: Timestamp.now(), processed: true,
  });
  await db.collection('usages').doc('U-0001').set({
    studentId: 'S-0001', familyId: 'F-0001', quantity: 7, classSection: '3A',
    note: null, operatorUid: operatorUid, date: Timestamp.now(), createdAt: Timestamp.now(), processed: true,
  });
  await db.collection('topUps').doc('T-0002').set({
    studentId: 'S-0002', familyId: 'F-0001', amount: 20, bonificoRef: 'CRO-TEST-002',
    documentPath: null, operatorUid: operatorUid, date: Timestamp.now(), createdAt: Timestamp.now(), processed: true,
  });
  await db.collection('usages').doc('U-0002').set({
    studentId: 'S-0002', familyId: 'F-0001', quantity: 5, classSection: '1B',
    note: null, operatorUid: operatorUid, date: Timestamp.now(), createdAt: Timestamp.now(), processed: true,
  });

  await db.collection('settings').doc('global').set({
    minThreshold: 5,
    testMode: true,
    blockNegativeBalance: true,
    testEmails: ['operatore@esempio.it'],
    templates: {
      alertSubject: 'Avviso: Credito Mensa in esaurimento',
      alertBody:
        'Attenzione: il conto mensa con ID [ID] - [NOME] [COGNOME] ha raggiunto la soglia minima di [BIGLIETTI] buoni. Si prega di ricaricare indicando l\'IBAN. Cordiali Saluti.',
      usedBody:
        'Sul conto mensa con ID [ID] - [NOME] [COGNOME] è stato utilizzato un buono pasto. Rimangono [RIMANENTI] biglietti.',
      orderBody: 'Si prega di procedere con numero [PASTI] pasti da fornire per il mese di [MESE] [ANNO]. Cordiali Saluti.',
    },
    supplierEmail: 'fornitore@esempio.it',
  });

  console.log('Seed completato: famiglia F-0001 (Mario e Anna Rossi), utenti operatore@esempio.it / famiglia@esempio.it (password: password123).');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
