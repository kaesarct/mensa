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
