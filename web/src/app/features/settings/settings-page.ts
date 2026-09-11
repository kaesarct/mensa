import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class SettingsPage {
  private readonly settingsService = inject(SettingsService);

  protected readonly settings = toSignal(this.settingsService.get(), { initialValue: undefined });

  protected minThreshold = 5;
  protected testMode = true;
  protected blockNegativeBalance = true;
  protected testEmailsText = '';
  protected supplierEmail = '';
  protected alertSubject = '';
  protected alertBody = '';
  protected usedBody = '';
  protected orderBody = '';

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  constructor() {
    effect(() => {
      const s = this.settings();
      if (!s) return;
      this.minThreshold = s.minThreshold;
      this.testMode = s.testMode;
      this.blockNegativeBalance = s.blockNegativeBalance;
      this.testEmailsText = s.testEmails.join(', ');
      this.supplierEmail = s.supplierEmail;
      this.alertSubject = s.templates.alertSubject;
      this.alertBody = s.templates.alertBody;
      this.usedBody = s.templates.usedBody;
      this.orderBody = s.templates.orderBody;
    });
  }

  async submit(): Promise<void> {
    this.error.set(null);
    this.success.set(null);
    if (!this.minThreshold || this.minThreshold < 0 || !this.supplierEmail) {
      this.error.set('Compila i campi obbligatori con valori validi.');
      return;
    }
    this.saving.set(true);
    try {
      await this.settingsService.update({
        minThreshold: this.minThreshold,
        testMode: this.testMode,
        blockNegativeBalance: this.blockNegativeBalance,
        testEmails: this.testEmailsText
          .split(',')
          .map((e) => e.trim())
          .filter((e) => e.length > 0),
        supplierEmail: this.supplierEmail,
        templates: {
          alertSubject: this.alertSubject,
          alertBody: this.alertBody,
          usedBody: this.usedBody,
          orderBody: this.orderBody,
        },
      });
      this.success.set('Impostazioni salvate.');
    } catch {
      this.error.set('Salvataggio non riuscito. Riprova.');
    } finally {
      this.saving.set(false);
    }
  }
}
