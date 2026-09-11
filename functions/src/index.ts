import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { onTopUpCreated } from './triggers/onTopUpCreated';
export { onUsageCreated } from './triggers/onUsageCreated';
export { checkThresholdsScheduled } from './scheduled/checkThresholds';
export { registerTopUp } from './callable/registerTopUp';
export { registerUsage } from './callable/registerUsage';
export { sendSupplierOrder } from './callable/sendSupplierOrder';
