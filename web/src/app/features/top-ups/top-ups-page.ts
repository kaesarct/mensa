import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { StudentsService } from '../../core/services/students.service';
import { TopUpsService } from '../../core/services/top-ups.service';
import { DocumentsService } from '../../core/services/documents.service';
import { CloudFunctionsService } from '../../core/services/cloud-functions.service';

@Component({
  selector: 'app-top-ups-page',
  imports: [FormsModule],
  templateUrl: './top-ups-page.html',
  styleUrl: './top-ups-page.css',
})
export class TopUpsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly studentsService = inject(StudentsService);
  private readonly topUpsService = inject(TopUpsService);
  private readonly documentsService = inject(DocumentsService);
  private readonly cloudFunctions = inject(CloudFunctionsService);

  protected readonly students = toSignal(this.studentsService.listAll(), { initialValue: [] });

  protected readonly history = toSignal(
    toObservable(this.authService.claims).pipe(switchMap((claims) => this.topUpsService.listForRole(claims))),
    { initialValue: undefined }
  );

  protected studentId = this.route.snapshot.queryParamMap.get('studentId') ?? '';
  protected amount: number | null = null;
  protected bonificoRef = '';
  protected date = new Date().toISOString().slice(0, 10);
  protected file: File | null = null;

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
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
    if (!student || !this.amount || this.amount <= 0 || !this.bonificoRef || !this.date) {
      this.error.set('Compila tutti i campi obbligatori con un importo positivo.');
      return;
    }
    this.saving.set(true);
    try {
      let documentPath: string | undefined;
      if (this.file) {
        documentPath = await this.documentsService.uploadTopUpDocument(student.familyId, this.file);
      }
      await this.cloudFunctions.registerTopUp({
        studentId: student.id,
        familyId: student.familyId,
        amount: this.amount,
        bonificoRef: this.bonificoRef,
        documentPath,
        date: this.date,
      });
      this.success.set('Ricarica registrata.');
      this.amount = null;
      this.bonificoRef = '';
      this.file = null;
    } catch {
      this.error.set('Registrazione non riuscita. Riprova.');
    } finally {
      this.saving.set(false);
    }
  }
}
