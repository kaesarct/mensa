import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { StudentsService } from '../../core/services/students.service';
import { UsagesService } from '../../core/services/usages.service';
import { CloudFunctionsService } from '../../core/services/cloud-functions.service';

@Component({
  selector: 'app-usages-page',
  imports: [FormsModule],
  templateUrl: './usages-page.html',
  styleUrl: './usages-page.css',
})
export class UsagesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly studentsService = inject(StudentsService);
  private readonly usagesService = inject(UsagesService);
  private readonly cloudFunctions = inject(CloudFunctionsService);

  protected readonly students = toSignal(this.studentsService.listAll(), { initialValue: [] });

  protected readonly history = toSignal(
    toObservable(this.authService.claims).pipe(switchMap((claims) => this.usagesService.listForRole(claims))),
    { initialValue: undefined }
  );

  protected studentId = this.route.snapshot.queryParamMap.get('studentId') ?? '';
  protected quantity = 1;
  protected classSection = '';
  protected date = new Date().toISOString().slice(0, 10);
  protected note = '';

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  onStudentChange(): void {
    const s = this.students().find((x) => x.id === this.studentId);
    if (s && !this.classSection) {
      this.classSection = `${s.classe}${s.sezione}`;
    }
  }

  protected fmtDate(ts: Timestamp): string {
    return ts.toDate().toLocaleDateString('it-IT');
  }

  studentLabel(id: string): string {
    const s = this.students().find((x) => x.id === id);
    return s ? `${s.cognome} ${s.nome} (${s.classe}${s.sezione})` : id;
  }

  async submit(): Promise<void> {
    this.error.set(null);
    this.success.set(null);
    const student = this.students().find((s) => s.id === this.studentId);
    if (!student || !this.quantity || this.quantity <= 0 || !this.classSection || !this.date) {
      this.error.set('Compila tutti i campi obbligatori con una quantità positiva.');
      return;
    }
    this.saving.set(true);
    try {
      await this.cloudFunctions.registerUsage({
        studentId: student.id,
        familyId: student.familyId,
        quantity: this.quantity,
        classSection: this.classSection,
        note: this.note || undefined,
        date: this.date,
      });
      this.success.set('Utilizzo registrato.');
      this.quantity = 1;
      this.note = '';
    } catch (err) {
      // La callable rifiuta con un messaggio leggibile (es. saldo negativo
      // bloccato da impostazioni): meglio mostrarlo che un errore generico.
      // L'SDK Functions aggiunge un suffisso tipo " [400]" al messaggio: si toglie
      // perché non è informazione utile per l'operatore.
      const message = err instanceof Error ? err.message.replace(/\s*\[\d+\]$/, '') : null;
      this.error.set(message || 'Registrazione non riuscita. Riprova.');
    } finally {
      this.saving.set(false);
    }
  }
}
