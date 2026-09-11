import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { FamiliesService } from '../../core/services/families.service';
import { StudentsService } from '../../core/services/students.service';

interface FamilyRow {
  id: string;
  cognome: string;
  emails: string[];
  childrenCount: number;
  ticketsRemaining: number;
}

@Component({
  selector: 'app-family-list',
  imports: [RouterLink],
  templateUrl: './family-list.html',
  styleUrl: './family-list.css',
})
export class FamilyList {
  protected readonly authService = inject(AuthService);
  private readonly familiesService = inject(FamiliesService);
  private readonly studentsService = inject(StudentsService);

  // Una query families + una students (non N+1 per famiglia): l'aggregazione
  // figli/saldo si fa lato client, accettabile al volume atteso (~200 alunni).
  protected readonly rows = toSignal<FamilyRow[] | undefined>(
    combineLatest([this.familiesService.listAll(), this.studentsService.listAll()]).pipe(
      map(([families, students]) =>
        families.map((f) => {
          const children = students.filter((s) => s.familyId === f.id);
          return {
            id: f.id,
            cognome: f.cognome,
            emails: f.emails,
            childrenCount: children.length,
            ticketsRemaining: children.reduce((sum, s) => sum + s.ticketsRemaining, 0),
          };
        })
      )
    ),
    { initialValue: undefined }
  );

  protected isStaff(): boolean {
    const role = this.authService.claims().role;
    return role === 'admin' || role === 'operatore';
  }
}
