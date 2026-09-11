import { Timestamp } from 'firebase-admin/firestore';

export type Role = 'admin' | 'operatore' | 'famiglia' | 'sola_lettura';

export type TicketStatus = 'sufficienti' | 'sotto_soglia' | 'esaurito';

export interface Family {
  cognome: string;
  emails: string[];
  telefono?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TopUp {
  studentId: string;
  familyId: string;
  amount: number;
  bonificoRef: string;
  documentPath: string | null;
  operatorUid: string;
  date: Timestamp;
  createdAt: Timestamp;
  processed: boolean;
}

export interface Usage {
  studentId: string;
  familyId: string;
  quantity: number;
  classSection: string;
  note: string | null;
  operatorUid: string;
  date: Timestamp;
  createdAt: Timestamp;
  processed: boolean;
}

export interface MonthlyOrder {
  mealsCount: number;
  supplierEmail: string;
  status: 'bozza' | 'inviato';
  sentAt: Timestamp | null;
  sentByUid: string | null;
  month: number;
  year: number;
}

export interface EmailTemplates {
  alertSubject: string;
  alertBody: string;
  usedBody: string;
  orderBody: string;
}

export interface Settings {
  minThreshold: number;
  testMode: boolean;
  testEmails: string[];
  templates: EmailTemplates;
  supplierEmail: string;
  blockNegativeBalance: boolean;
}

export interface AuditLogEntry {
  action: string;
  actorUid: string;
  targetPath: string;
  before?: unknown;
  after?: unknown;
  timestamp: Timestamp;
}
