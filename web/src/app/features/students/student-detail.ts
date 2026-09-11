import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { catchError, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { StudentsService } from '../../core/services/students.service';
import { FamiliesService } from '../../core/services/families.service';
import { TopUpsService } from '../../core/services/top-ups.service';
import { UsagesService } from '../../core/services/usages.service';
import { StudentInput, TICKET_BADGE_CLASS, TICKET_STATUS_LABEL } from '../../core/models/student.model';
import { FamilyWithId } from '../../core/models/family.model';

@Component({
  selector: 'app-student-detail',
  imports: [FormsModule, RouterLink],
  templateUrl: './student-detail.html',
  styleUrl: './student-detail.css',
})
export class StudentDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studentsService = inject(StudentsService);
  private readonly familiesService = inject(FamiliesService);
  private readonly topUpsService = inject(TopUpsService);
  private readonly usagesService = inject(UsagesService);
  protected readonly authService = inject(AuthService);

  protected readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id'),
  });
  protected readonly isCreate = computed(() => !this.id());

  // undefined = loading, null = non trovato/accesso negato, altrimenti caricato.
  protected readonly student = toSignal(
    toObservable(this.id).pipe(
      switchMap((id) => (id ? this.studentsService.get(id).pipe(catchError(() => of(null))) : of(undefined)))
    ),
    { initialValue: undefined }
  );

  protected readonly families = toSignal(this.familiesService.listAll(), {
    initialValue: [] as FamilyWithId[],
  });

  protected readonly topUps = toSignal(
    toObservable(this.id).pipe(switchMap((id) => (id ? this.topUpsService.listByStudent(id) : of([])))),
    { initialValue: [] }
  );

  protected readonly usages = toSignal(
    toObservable(this.id).pipe(switchMap((id) => (id ? this.usagesService.listByStudent(id) : of([])))),
    { initialValue: [] }
  );

  protected familyId = '';
  protected nome = '';
  protected cognome = '';
  protected dataNascita = '';
  protected classe = '';
  protected sezione = '';
  protected note = '';
  protected status: 'attivo' | 'archiviato' = 'attivo';

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly badgeClass = TICKET_BADGE_CLASS;
  protected readonly statusLabel = TICKET_STATUS_LABEL;

  constructor() {
    effect(() => {
      const s = this.student();
      if (!s) return;
      this.familyId = s.familyId;
      this.nome = s.nome;
      this.cognome = s.cognome;
      this.dataNascita = s.dataNascita ? s.dataNascita.toDate().toISOString().slice(0, 10) : '';
      this.classe = s.classe;
      this.sezione = s.sezione;
      this.note = s.note;
      this.status = s.status;
    });
  }

  protected fmtDate(ts: Timestamp): string {
    return ts.toDate().toLocaleDateString('it-IT');
  }

  protected isStaff(): boolean {
    const role = this.authService.claims().role;
    return role === 'admin' || role === 'operatore';
  }

  async submit(): Promise<void> {
    this.error.set(null);
    if (!this.familyId || !this.nome || !this.cognome || !this.dataNascita) {
      this.error.set('Compila tutti i campi obbligatori.');
      return;
    }
    this.saving.set(true);
    try {
      const input: StudentInput = {
        familyId: this.familyId,
        nome: this.nome,
        cognome: this.cognome,
        dataNascita: Timestamp.fromDate(new Date(this.dataNascita)),
        classe: this.classe,
        sezione: this.sezione,
        note: this.note,
        status: this.status,
      };
      if (this.isCreate()) {
        const newId = await this.studentsService.create(input);
        await this.router.navigate(['/students', newId]);
      } else {
        await this.studentsService.update(this.id()!, input);
      }
    } catch {
      this.error.set('Salvataggio non riuscito. Riprova.');
    } finally {
      this.saving.set(false);
    }
  }
}
