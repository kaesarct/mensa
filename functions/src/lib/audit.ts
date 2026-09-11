import { Firestore, FieldValue } from 'firebase-admin/firestore';

export async function logAudit(
  db: Firestore,
  entry: { action: string; actorUid: string; targetPath: string; before?: unknown; after?: unknown }
): Promise<void> {
  await db.collection('auditLog').add({
    ...entry,
    timestamp: FieldValue.serverTimestamp(),
  });
}
