import { Component, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { StudentsService } from '../../core/services/students.service';
import { TICKET_BADGE_CLASS, TICKET_STATUS_LABEL, TicketStatus } from '../../core/models/student.model';

@Component({
  selector: 'app-students-list',
  imports: [RouterLink],
  templateUrl: './students-list.html',
  styleUrl: './students-list.css',
})
export class StudentsList {
  private readonly authService = inject(AuthService);
  private readonly studentsService = inject(StudentsService);

  private readonly claims$ = toObservable(this.authService.claims);

  protected readonly isStaff = () => {
    const role = this.authService.claims().role;
    return role === 'admin' || role === 'operatore';
  };

  // undefined = ruolo o dati non ancora arrivati (loading); [] = lista vuota
  // confermata. Distinzione necessaria per non mostrare "Nessun alunno" mentre
  // in realtà si sta ancora aspettando la prima risposta di Firestore.
  protected readonly students = toSignal(
    this.claims$.pipe(switchMap((claims) => (claims.role ? this.studentsService.listForRole(claims) : of(undefined)))),
    { initialValue: undefined }
  );

  protected badgeClass(status: TicketStatus): string {
    return TICKET_BADGE_CLASS[status];
  }

  protected statusLabel(status: TicketStatus): string {
    return TICKET_STATUS_LABEL[status];
  }
}
