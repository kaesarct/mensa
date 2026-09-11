import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { AggregateField, FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { requireAdmin } from '../lib/authz';
import { createEmailSender } from '../lib/email';
import { renderTemplate } from '../lib/templates';
import { logAudit } from '../lib/audit';
import { Settings } from '../types';

const MESI_ITALIANO = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

interface SendSupplierOrderData {
  month: number; // 1-12
  year: number;
}

export const sendSupplierOrder = onCall<SendSupplierOrderData>(async (request) => {
  requireAdmin(request.auth);
  const { month, year } = request.data;

  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
    throw new HttpsError('invalid-argument', 'month (1-12) e year sono obbligatori.');
  }

  const db = getFirestore();
  const orderId = `${year}-${String(month).padStart(2, '0')}`;
  const orderRef = db.collection('monthlyOrders').doc(orderId);

  const settingsSnap = await db.collection('settings').doc('global').get();
  const settings = settingsSnap.data() as Settings | undefined;
  if (!settings) throw new HttpsError('failed-precondition', 'Impostazioni non configurate.');

  const rangeStart = Timestamp.fromDate(new Date(Date.UTC(year, month - 1, 1)));
  const rangeEnd = Timestamp.fromDate(new Date(Date.UTC(year, month, 1)));

  // BR-08: unicità mensile garantita dalla transazione sull'ID documento
  // (yyyy-mm), non da un controllo di stato letto e riscritto separatamente.
  const created = await db.runTransaction(async (tx) => {
    const existing = await tx.get(orderRef);
    if (existing.exists && existing.data()?.['status'] === 'inviato') {
      return false;
    }

    const usagesAgg = await db
      .collection('usages')
      .where('date', '>=', rangeStart)
      .where('date', '<', rangeEnd)
      .aggregate({ total: AggregateField.sum('quantity') })
      .get();
    const mealsCount = usagesAgg.data().total ?? 0;

    tx.set(orderRef, {
      mealsCount,
      supplierEmail: settings.supplierEmail,
      status: 'inviato',
      sentAt: FieldValue.serverTimestamp(),
      sentByUid: request.auth!.uid,
      month,
      year,
    });
    return true;
  });

  if (!created) {
    throw new HttpsError('already-exists', `Ordine per ${month}/${year} già inviato.`);
  }

  const orderSnap = await orderRef.get();
  const mealsCount = orderSnap.data()?.['mealsCount'] ?? 0;
  const body = renderTemplate(settings.templates.orderBody, {
    pasti: mealsCount,
    mese: MESI_ITALIANO[month - 1],
    anno: year,
  });
  const recipients = settings.testMode ? settings.testEmails : [settings.supplierEmail];
  const subject = settings.testMode
    ? `[TEST] Ordine Pasti Mensile — ${MESI_ITALIANO[month - 1]} ${year}`
    : `Ordine Pasti Mensile — ${MESI_ITALIANO[month - 1]} ${year}`;

  await createEmailSender().send({ to: recipients, subject, body });
  await logAudit(db, { action: 'supplierOrder.sent', actorUid: request.auth!.uid, targetPath: orderRef.path });

  return { orderId, mealsCount };
});
