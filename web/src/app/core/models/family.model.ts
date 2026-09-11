import { Timestamp } from '@angular/fire/firestore';

export interface Family {
  cognome: string;
  emails: string[];
  telefono?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type FamilyWithId = Family & { id: string };

export type FamilyInput = Pick<Family, 'cognome' | 'emails' | 'telefono'>;
