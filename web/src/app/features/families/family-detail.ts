import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { FamiliesService } from '../../core/services/families.service';
import { StudentsService } from '../../core/services/students.service';

@Component({
  selector: 'app-family-detail',
  imports: [FormsModule, RouterLink],
  templateUrl: './family-detail.html',
  styleUrl: './family-detail.css',
})
export class FamilyDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly familiesService = inject(FamiliesService);
  private readonly studentsService = inject(StudentsService);

  protected readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id'),
  });
  protected readonly isCreate = computed(() => !this.id());

  protected readonly family = toSignal(
    toObservable(this.id).pipe(
      switchMap((id) => (id ? this.familiesService.get(id).pipe(catchError(() => of(null))) : of(undefined)))
    ),
    { initialValue: undefined }
  );

  protected readonly children = toSignal(
    toObservable(this.id).pipe(switchMap((id) => (id ? this.studentsService.listByFamily(id) : of([])))),
    { initialValue: [] }
  );

  protected cognome = '';
  protected emailsText = '';
  protected telefono = '';

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const f = this.family();
      if (!f) return;
      this.cognome = f.cognome;
      this.emailsText = f.emails.join(', ');
      this.telefono = f.telefono ?? '';
    });
  }

  async submit(): Promise<void> {
    this.error.set(null);
    const emails = this.emailsText
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    if (!this.cognome || emails.length === 0) {
      this.error.set('Cognome e almeno una email sono obbligatori.');
      return;
    }
    this.saving.set(true);
    try {
      const input = { cognome: this.cognome, emails, telefono: this.telefono || undefined };
      if (this.isCreate()) {
        const newId = await this.familiesService.create(input);
        await this.router.navigate(['/families', newId]);
      } else {
        await this.familiesService.update(this.id()!, input);
      }
    } catch {
      this.error.set('Salvataggio non riuscito. Riprova.');
    } finally {
      this.saving.set(false);
    }
  }
}
