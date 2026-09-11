import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { applyTopUp } from '../lib/balances';

export const onTopUpCreated = onDocumentCreated('topUps/{topUpId}', async (event) => {
  const db = getFirestore();
  await applyTopUp(db, event.params.topUpId);
});
