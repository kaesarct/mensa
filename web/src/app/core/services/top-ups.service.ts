import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, limit, orderBy, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Claims } from '../auth/auth.service';
import { TopUpWithId } from '../models/top-up.model';

@Injectable({ providedIn: 'root' })
export class TopUpsService {
  private readonly firestore = inject(Firestore);

  // Scrittura assente di proposito: il log è immutabile e passa solo dalla
  // callable registerTopUp (vedi CloudFunctionsService) — coerente con
  // firestore.rules (`allow create, update, delete: if false`).
  listForRole(claims: Claims, max = 200): Observable<TopUpWithId[]> {
    const ref = collection(this.firestore, 'topUps');
    const q =
      claims.role === 'famiglia' && claims.familyId
        ? query(ref, where('familyId', '==', claims.familyId), orderBy('date', 'desc'), limit(max))
        : query(ref, orderBy('date', 'desc'), limit(max));
    return collectionData(q, { idField: 'id' }) as Observable<TopUpWithId[]>;
  }

  listByStudent(studentId: string, max = 20): Observable<TopUpWithId[]> {
    const ref = collection(this.firestore, 'topUps');
    const q = query(ref, where('studentId', '==', studentId), orderBy('date', 'desc'), limit(max));
    return collectionData(q, { idField: 'id' }) as Observable<TopUpWithId[]>;
  }
}
