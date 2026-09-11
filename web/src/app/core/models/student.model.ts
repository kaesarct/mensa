import { Timestamp } from '@angular/fire/firestore';

export type TicketStatus = 'sufficienti' | 'sotto_soglia' | 'esaurito';

export interface Student {
  familyId: string;
  nome: string;
  cognome: string;
  dataNascita: Timestamp;
  classe: string;
  sezione: string;
  note: string;
  consentRef?: string;
  status: 'attivo' | 'archiviato';
  ticketsPurchased: number;
  ticketsUsed: number;
  ticketsRemaining: number;
  ticketStatus: TicketStatus;
  lastAlertSentAt: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type StudentWithId = Student & { id: string };

// Campi anagrafici modificabili dal client (i saldi sono protetti dalle
// security rules e scrivibili solo dalle Cloud Functions — vedi firestore.rules).
export type StudentInput = Pick<
  Student,
  'familyId' | 'nome' | 'cognome' | 'dataNascita' | 'classe' | 'sezione' | 'note' | 'status'
> & { consentRef?: string };

export const TICKET_BADGE_CLASS: Record<TicketStatus, string> = {
  sufficienti: 'badge-success',
  sotto_soglia: 'badge-warning',
  esaurito: 'badge-danger',
};

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  sufficienti: 'Sufficienti',
  sotto_soglia: 'Sotto soglia',
  esaurito: 'Esaurito',
};
