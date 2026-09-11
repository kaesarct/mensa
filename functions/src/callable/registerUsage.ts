import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { requireStaff } from '../lib/authz';
import { Settings, Student } from '../types';

interface RegisterUsageData {
  studentId: string;
  familyId: string;
  quantity: number;
  classSection: string;
  note?: string;
  date: string; // ISO date
}

export const registerUsage = onCall<RegisterUsageData>(async (request) => {
  requireStaff(request.auth);
  const { studentId, familyId, quantity, classSection, note, date } = request.data;

  if (!studentId || !familyId || !classSection || !date) {
    throw new HttpsError('invalid-argument', 'Campi obbligatori mancanti.');
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new HttpsError('invalid-argument', 'quantity deve essere un numero positivo.');
  }

  const db = getFirestore();

  const [settingsSnap, studentSnap] = await Promise.all([
    db.collection('settings').doc('global').get(),
    db.collection('students').doc(studentId).get(),
  ]);
  const settings = settingsSnap.data() as Settings | undefined;
  const student = studentSnap.data() as Student | undefined;
  if (!student) {
    throw new HttpsError('not-found', 'Alunno non trovato.');
  }

  // Impostazione opzionale (settings.blockNegativeBalance): blocca la
  // registrazione se porterebbe il saldo sotto zero, invece di lasciarlo
  // scendere in negativo (0 resta comunque "esaurito", non è il caso bloccato).
  if (settings?.blockNegativeBalance && student.ticketsRemaining - quantity < 0) {
    throw new HttpsError(
      'failed-precondition',
      `Saldo insufficiente: rimangono ${student.ticketsRemaining} biglietti, richiesti ${quantity}.`
    );
  }

  const ref = await db.collection('usages').add({
    studentId,
    familyId,
    quantity,
    classSection,
    note: note ?? null,
    operatorUid: request.auth!.uid,
    date: Timestamp.fromDate(new Date(date)),
    createdAt: FieldValue.serverTimestamp(),
    processed: false,
  });

  return { usageId: ref.id };
});
