import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { requireStaff } from '../lib/authz';

interface RegisterTopUpData {
  studentId: string;
  familyId: string;
  amount: number;
  bonificoRef: string;
  documentPath?: string;
  date: string; // ISO date, inserita dall'operatore
}

export const registerTopUp = onCall<RegisterTopUpData>(async (request) => {
  requireStaff(request.auth);
  const { studentId, familyId, amount, bonificoRef, documentPath, date } = request.data;

  if (!studentId || !familyId || !bonificoRef || !date) {
    throw new HttpsError('invalid-argument', 'Campi obbligatori mancanti.');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError('invalid-argument', 'amount deve essere un numero positivo.');
  }

  const db = getFirestore();
  const ref = await db.collection('topUps').add({
    studentId,
    familyId,
    amount,
    bonificoRef,
    documentPath: documentPath ?? null,
    operatorUid: request.auth!.uid,
    date: Timestamp.fromDate(new Date(date)),
    createdAt: FieldValue.serverTimestamp(),
    processed: false,
  });

  return { topUpId: ref.id };
});
