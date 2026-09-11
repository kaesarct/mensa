import { Timestamp } from '@angular/fire/firestore';

export interface TopUp {
  studentId: string;
  familyId: string;
  amount: number;
  bonificoRef: string;
  documentPath: string | null;
  operatorUid: string;
  date: Timestamp;
  createdAt?: Timestamp;
  processed: boolean;
}

export type TopUpWithId = TopUp & { id: string };
