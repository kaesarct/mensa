import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  Firestore,
  collection,
  getAggregateFromServer,
  getCountFromServer,
  query,
  sum,
  where,
} from '@angular/fire/firestore';
import { StudentsService } from '../../core/services/students.service';
import { TICKET_BADGE_CLASS, TICKET_STATUS_LABEL } from '../../core/models/student.model';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly firestore = inject(Firestore);
  private readonly studentsService = inject(StudentsService);

  protected readonly urgentStudents = toSignal(this.studentsService.listUrgent(), { initialValue: undefined });

  protected readonly totalStudents = signal<number | null>(null);
  protected readonly belowThreshold = signal<number | null>(null);
  protected readonly activeAlerts = signal<number | null>(null);
  protected readonly totalUsed = signal<number | null>(null);

  protected readonly badgeClass = TICKET_BADGE_CLASS;
  protected readonly statusLabel = TICKET_STATUS_LABEL;

  constructor() {
    void this.loadKpis();
  }

  private async loadKpis(): Promise<void> {
    const studentsRef = collection(this.firestore, 'students');

    const [total, below, alerts, usage] = await Promise.all([
      getCountFromServer(query(studentsRef)),
      getCountFromServer(query(studentsRef, where('ticketStatus', 'in', ['sotto_soglia', 'esaurito']))),
      getCountFromServer(query(studentsRef, where('lastAlertSentAt', '!=', null))),
      getAggregateFromServer(collection(this.firestore, 'usages'), { total: sum('quantity') }),
    ]);

    this.totalStudents.set(total.data().count);
    this.belowThreshold.set(below.data().count);
    this.activeAlerts.set(alerts.data().count);
    this.totalUsed.set(usage.data().total);
  }
}
