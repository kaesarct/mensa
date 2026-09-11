import { Timestamp } from '@angular/fire/firestore';

export interface Usage {
  studentId: string;
  familyId: string;
  quantity: number;
  classSection: string;
  note: string | null;
  operatorUid: string;
  date: Timestamp;
  createdAt?: Timestamp;
  processed: boolean;
}

export type UsageWithId = Usage & { id: string };
