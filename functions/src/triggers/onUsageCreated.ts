import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { applyUsage } from '../lib/balances';
import { createEmailSender } from '../lib/email';
import { renderTemplate, applyTestMode } from '../lib/templates';
import { logAudit } from '../lib/audit';
import { Family, Settings, Student, Usage } from '../types';

export const onUsageCreated = onDocumentCreated('usages/{usageId}', async (event) => {
  const db = getFirestore();
  const usageId = event.params.usageId;
  const usage = event.data?.data() as Usage | undefined;
  if (!usage) return;

  const applied = await applyUsage(db, usageId);
  if (!applied) return; // già processato (retry) — nessuna doppia email, replica BR-01

  const [studentSnap, settingsSnap, familySnap] = await Promise.all([
    db.collection('students').doc(usage.studentId).get(),
    db.collection('settings').doc('global').get(),
    db.collection('families').doc(usage.familyId).get(),
  ]);
  const student = studentSnap.data() as Student | undefined;
  const settings = settingsSnap.data() as Settings | undefined;
  const family = familySnap.data() as Family | undefined;
  if (!student || !settings || !family) return;

  const body = renderTemplate(settings.templates.usedBody, {
    id: usage.studentId,
    nome: student.nome,
    cognome: student.cognome,
    rimanenti: student.ticketsRemaining,
  });
  const { subject, recipients } = applyTestMode(
    'Notifica utilizzo buono mensa',
    family.emails,
    settings.testMode,
    settings.testEmails
  );

  await createEmailSender().send({ to: recipients, subject, body });
  await logAudit(db, {
    action: 'usage.notified',
    actorUid: usage.operatorUid,
    targetPath: `students/${usage.studentId}`,
  });
});
