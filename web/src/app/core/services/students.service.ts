import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  addDoc,
  collection,
  collectionData,
  doc,
  docData,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Claims } from '../auth/auth.service';
import { StudentInput, StudentWithId } from '../models/student.model';

@Injectable({ providedIn: 'root' })
export class StudentsService {
  private readonly firestore = inject(Firestore);

  /**
   * Query scoping obbligatorio lato client per il ruolo "famiglia": le
   * security rules accettano un list query non filtrato solo per
   * staff/sola_lettura; per la famiglia va sempre passato un
   * where('familyId','==',...) altrimenti Firestore rifiuta l'intera query.
   */
  listForRole(claims: Claims): Observable<StudentWithId[]> {
    const ref = collection(this.firestore, 'students');
    const q =
      claims.role === 'famiglia' && claims.familyId
        ? query(ref, where('familyId', '==', claims.familyId))
        : query(ref, orderBy('cognome'));
    return collectionData(q, { idField: 'id' }) as Observable<StudentWithId[]>;
  }

  /** Lista non filtrata: accettata dalle rules solo per staff/sola_lettura. */
  listAll(): Observable<StudentWithId[]> {
    const ref = collection(this.firestore, 'students');
    return collectionData(query(ref, orderBy('cognome')), { idField: 'id' }) as Observable<StudentWithId[]>;
  }

  /** Alunni sotto soglia o esauriti, ordinati per urgenza — usata dalla Dashboard. */
  listUrgent(): Observable<StudentWithId[]> {
    const ref = collection(this.firestore, 'students');
    const q = query(ref, where('ticketStatus', 'in', ['sotto_soglia', 'esaurito']), orderBy('ticketsRemaining'));
    return collectionData(q, { idField: 'id' }) as Observable<StudentWithId[]>;
  }

  listByFamily(familyId: string): Observable<StudentWithId[]> {
    const ref = collection(this.firestore, 'students');
    return collectionData(query(ref, where('familyId', '==', familyId)), {
      idField: 'id',
    }) as Observable<StudentWithId[]>;
  }

  get(id: string): Observable<StudentWithId | undefined> {
    return docData(doc(this.firestore, 'students', id), { idField: 'id' }) as Observable<
      StudentWithId | undefined
    >;
  }

  async create(input: StudentInput): Promise<string> {
    const ref = await addDoc(collection(this.firestore, 'students'), {
      ...input,
      ticketsPurchased: 0,
      ticketsUsed: 0,
      ticketsRemaining: 0,
      ticketStatus: 'sufficienti',
      lastAlertSentAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async update(id: string, input: StudentInput): Promise<void> {
    await updateDoc(doc(this.firestore, 'students', id), {
      ...input,
      updatedAt: serverTimestamp(),
    });
  }

  toDate(timestamp: Timestamp | undefined): Date | undefined {
    return timestamp?.toDate();
  }
}
