import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

// Richiede l'emulatore Firestore avviato su localhost:8080 (`npm run emulators`
// dalla root, o `firebase emulators:start --only firestore`).
let testEnv: RulesTestEnvironment;

const FAMILY_A = 'F-0001';
const FAMILY_B = 'F-0002';
const STUDENT_A = 'S-0001';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-mensa-rules-test',
    firestore: {
      host: 'localhost',
      port: 8080,
      rules: readFileSync('../firestore.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().collection('students').doc(STUDENT_A).set({
      familyId: FAMILY_A,
      nome: 'Mario',
      cognome: 'Rossi',
      status: 'attivo',
      ticketsPurchased: 10,
      ticketsUsed: 7,
      ticketsRemaining: 3,
      ticketStatus: 'sotto_soglia',
      lastAlertSentAt: null,
    });
  });
});

describe('students', () => {
  it('nega la lettura a un utente non autenticato', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection('students').doc(STUDENT_A).get());
  });

  it('permette alla famiglia proprietaria di leggere il proprio figlio', async () => {
    const db = testEnv.authenticatedContext('parent-a', { role: 'famiglia', familyId: FAMILY_A }).firestore();
    await assertSucceeds(db.collection('students').doc(STUDENT_A).get());
  });

  it('nega a una famiglia diversa la lettura di uno studente non suo', async () => {
    const db = testEnv.authenticatedContext('parent-b', { role: 'famiglia', familyId: FAMILY_B }).firestore();
    await assertFails(db.collection('students').doc(STUDENT_A).get());
  });

  it('permette allo staff di leggere tutti gli studenti', async () => {
    const db = testEnv.authenticatedContext('op-1', { role: 'operatore' }).firestore();
    await assertSucceeds(db.collection('students').doc(STUDENT_A).get());
  });

  it('nega alla famiglia la scrittura sui saldi', async () => {
    const db = testEnv.authenticatedContext('parent-a', { role: 'famiglia', familyId: FAMILY_A }).firestore();
    await assertFails(db.collection('students').doc(STUDENT_A).update({ ticketsRemaining: 999 }));
  });

  it('nega allo staff la modifica diretta dei campi saldo (solo le Cloud Functions possono)', async () => {
    const db = testEnv.authenticatedContext('op-1', { role: 'operatore' }).firestore();
    await assertFails(db.collection('students').doc(STUDENT_A).update({ ticketsRemaining: 999 }));
  });

  it('permette allo staff di aggiornare campi anagrafici non protetti', async () => {
    const db = testEnv.authenticatedContext('op-1', { role: 'operatore' }).firestore();
    await assertSucceeds(db.collection('students').doc(STUDENT_A).update({ note: 'Allergia da confermare' }));
  });

  it('nega la creazione di uno studente con saldo iniziale diverso da zero', async () => {
    const db = testEnv.authenticatedContext('op-1', { role: 'operatore' }).firestore();
    await assertFails(
      db.collection('students').doc('S-9999').set({
        familyId: FAMILY_A,
        nome: 'Test',
        cognome: 'Test',
        status: 'attivo',
        ticketsPurchased: 100,
        ticketsUsed: 0,
        ticketsRemaining: 100,
        ticketStatus: 'sufficienti',
        lastAlertSentAt: null,
      })
    );
  });

  it('nega sempre la scrittura diretta sui log topUps/usages (solo callable via Admin SDK)', async () => {
    const db = testEnv.authenticatedContext('op-1', { role: 'operatore' }).firestore();
    await assertFails(
      db.collection('topUps').add({ studentId: STUDENT_A, familyId: FAMILY_A, amount: 10 })
    );
  });
});
