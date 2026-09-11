import { AggregateField, Firestore } from 'firebase-admin/firestore';
import { Settings, TicketStatus } from '../types';

export function computeTicketStatus(remaining: number, minThreshold: number): TicketStatus {
  if (remaining <= 0) return 'esaurito';
  if (remaining <= minThreshold) return 'sotto_soglia';
  return 'sufficienti';
}

/**
 * Applica una ricarica ai contatori denormalizzati dello studente (Opzione A,
 * piano §3). Transazionale e idempotente: un topUp già processato (retry del
 * trigger "at-least-once") viene ignorato senza incrementare due volte.
 */
export async function applyTopUp(db: Firestore, topUpId: string): Promise<boolean> {
  const topUpRef = db.collection('topUps').doc(topUpId);

  return db.runTransaction(async (tx) => {
    const topUpSnap = await tx.get(topUpRef);
    const topUp = topUpSnap.data();
    if (!topUp || topUp['processed']) return false;

    const studentRef = db.collection('students').doc(topUp['studentId'] as string);
    const [studentSnap, settingsSnap] = await Promise.all([
      tx.get(studentRef),
      tx.get(db.collection('settings').doc('global')),
    ]);
    const student = studentSnap.data();
    if (!student) throw new Error(`Studente ${topUp['studentId']} non trovato`);
    const settings = settingsSnap.data() as Settings | undefined;
    const minThreshold = settings?.minThreshold ?? 5;

    const ticketsPurchased = (student['ticketsPurchased'] as number) + (topUp['amount'] as number);
    const ticketsRemaining = ticketsPurchased - (student['ticketsUsed'] as number);
    const ticketStatus = computeTicketStatus(ticketsRemaining, minThreshold);

    tx.update(studentRef, {
      ticketsPurchased,
      ticketsRemaining,
      ticketStatus,
      // BR-02: tornati sopra soglia dopo una ricarica → azzera lo stato avviso.
      ...(ticketsRemaining > minThreshold ? { lastAlertSentAt: null } : {}),
      updatedAt: new Date(),
    });
    tx.update(topUpRef, { processed: true });
    return true;
  });
}

/**
 * Applica un utilizzo ai contatori denormalizzati dello studente. Stessa
 * logica di idempotenza di applyTopUp.
 */
export async function applyUsage(db: Firestore, usageId: string): Promise<boolean> {
  const usageRef = db.collection('usages').doc(usageId);

  return db.runTransaction(async (tx) => {
    const usageSnap = await tx.get(usageRef);
    const usage = usageSnap.data();
    if (!usage || usage['processed']) return false;

    const studentRef = db.collection('students').doc(usage['studentId'] as string);
    const [studentSnap, settingsSnap] = await Promise.all([
      tx.get(studentRef),
      tx.get(db.collection('settings').doc('global')),
    ]);
    const student = studentSnap.data();
    if (!student) throw new Error(`Studente ${usage['studentId']} non trovato`);
    const settings = settingsSnap.data() as Settings | undefined;
    const minThreshold = settings?.minThreshold ?? 5;

    const ticketsUsed = (student['ticketsUsed'] as number) + (usage['quantity'] as number);
    const ticketsRemaining = (student['ticketsPurchased'] as number) - ticketsUsed;
    const ticketStatus = computeTicketStatus(ticketsRemaining, minThreshold);

    tx.update(studentRef, {
      ticketsUsed,
      ticketsRemaining,
      ticketStatus,
      updatedAt: new Date(),
    });
    tx.update(usageRef, { processed: true });
    return true;
  });
}

/**
 * Opzione B (piano §3): ricalcola il saldo direttamente dai log con una query
 * di aggregazione, come doppio controllo prima di inviare l'avviso di soglia
 * minima — indipendente dai contatori denormalizzati, per non inviare avvisi
 * sbagliati in caso di bug nella denormalizzazione.
 */
export async function verifyRemainingViaAggregation(db: Firestore, studentId: string): Promise<number> {
  const [purchasedAgg, usedAgg] = await Promise.all([
    db
      .collection('topUps')
      .where('studentId', '==', studentId)
      .aggregate({ total: AggregateField.sum('amount') })
      .get(),
    db
      .collection('usages')
      .where('studentId', '==', studentId)
      .aggregate({ total: AggregateField.sum('quantity') })
      .get(),
  ]);
  const purchased = purchasedAgg.data().total ?? 0;
  const used = usedAgg.data().total ?? 0;
  return purchased - used;
}
