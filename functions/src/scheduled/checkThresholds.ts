import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import { verifyRemainingViaAggregation } from '../lib/balances';
import { createEmailSender, EmailSender } from '../lib/email';
import { renderTemplate, applyTestMode } from '../lib/templates';
import { logAudit } from '../lib/audit';
import { Family, Settings, Student } from '../types';

/**
 * Logica pura, esportata separatamente dal trigger onSchedule: il Functions
 * Emulator non simula Cloud Scheduler, quindi questa funzione va invocata
 * manualmente (script/test) per la verifica end-to-end in locale.
 */
export async function checkThresholdsAndSendAlerts(
  db: Firestore,
  emailSender: EmailSender
): Promise<{ sent: number }> {
  const settingsSnap = await db.collection('settings').doc('global').get();
  const settings = settingsSnap.data() as Settings | undefined;
  if (!settings) return { sent: 0 };

  // Filtro a singolo campo (nessun indice composito necessario): il resto dei
  // criteri (status, anti-duplicato) si applica in memoria, adeguato al volume
  // atteso (~200 alunni, piano §8).
  const candidatesSnap = await db
    .collection('students')
    .where('ticketsRemaining', '<=', settings.minThreshold)
    .get();

  let sent = 0;
  for (const doc of candidatesSnap.docs) {
    const student = doc.data() as Student;
    if (student.status !== 'attivo') continue;
    if (student.lastAlertSentAt) continue; // BR-01: nessun invio doppio

    // Opzione B (piano §3): doppio controllo indipendente dalla denormalizzazione
    // prima di un'email che arriva davvero alla famiglia.
    const verifiedRemaining = await verifyRemainingViaAggregation(db, doc.id);
    if (verifiedRemaining > settings.minThreshold) continue;

    const familySnap = await db.collection('families').doc(student.familyId).get();
    const family = familySnap.data() as Family | undefined;
    if (!family) continue;

    const body = renderTemplate(settings.templates.alertBody, {
      id: doc.id,
      nome: student.nome,
      cognome: student.cognome,
      biglietti: verifiedRemaining,
    });
    const { subject, recipients } = applyTestMode(
      settings.templates.alertSubject,
      family.emails,
      settings.testMode,
      settings.testEmails
    );

    await emailSender.send({ to: recipients, subject, body });
    await doc.ref.update({ lastAlertSentAt: FieldValue.serverTimestamp() });
    await logAudit(db, { action: 'threshold.alerted', actorUid: 'system', targetPath: doc.ref.path });
    sent++;
  }

  return { sent };
}

export const checkThresholdsScheduled = onSchedule(
  { schedule: '0 18 * * *', timeZone: 'Europe/Rome' },
  async () => {
    await checkThresholdsAndSendAlerts(getFirestore(), createEmailSender());
  }
);
