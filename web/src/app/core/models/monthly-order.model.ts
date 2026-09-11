import { Timestamp } from '@angular/fire/firestore';

export interface MonthlyOrder {
  mealsCount: number;
  supplierEmail: string;
  status: 'bozza' | 'inviato';
  sentAt: Timestamp | null;
  sentByUid: string | null;
  month: number;
  year: number;
}

export type MonthlyOrderWithId = MonthlyOrder & { id: string };
