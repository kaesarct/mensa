export interface EmailMessage {
  to: string[];
  subject: string;
  body: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Implementazione di default per sviluppo/emulatore: logga l'email invece di
 * inviarla davvero. Permette di verificare l'intero flusso automazioni senza
 * alcuna API key reale (nessun ESP configurato finché non si sceglie il dominio
 * email definitivo — vedi docs/PIANO_MIGRAZIONE_FIREBASE.md §10).
 */
export class ConsoleEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    console.log('[EMAIL:console]', JSON.stringify(message));
  }
}

/**
 * Placeholder per l'integrazione ESP reale (SendGrid/Resend/Mailgun) in Fase 4.
 * Non contiene alcuna chiave: legge ESP_API_KEY da env/Secret Manager e lancia
 * un errore esplicito se non configurata, per non fallire silenziosamente.
 */
export class HttpEmailSender implements EmailSender {
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(_message: EmailMessage): Promise<void> {
    if (!this.apiKey) {
      throw new Error('ESP_API_KEY non configurata: impossibile inviare email reali.');
    }
    throw new Error(
      `HttpEmailSender non ancora implementato (mittente configurato: ${this.from}) — da collegare a un ESP in Fase 4.`
    );
  }
}

export function createEmailSender(): EmailSender {
  const apiKey = process.env.ESP_API_KEY;
  if (!apiKey) {
    return new ConsoleEmailSender();
  }
  return new HttpEmailSender(apiKey, process.env.EMAIL_FROM ?? 'mensa@esempio.it');
}
