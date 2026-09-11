import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, limit, orderBy, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Claims } from '../auth/auth.service';
import { UsageWithId } from '../models/usage.model';

@Injectable({ providedIn: 'root' })
export class UsagesService {
  private readonly firestore = inject(Firestore);

  // Scrittura assente di proposito: passa solo dalla callable registerUsage
  // (vedi CloudFunctionsService) — coerente con firestore.rules.
  listForRole(claims: Claims, max = 200): Observable<UsageWithId[]> {
    const ref = collection(this.firestore, 'usages');
    const q =
      claims.role === 'famiglia' && claims.familyId
        ? query(ref, where('familyId', '==', claims.familyId), orderBy('date', 'desc'), limit(max))
        : query(ref, orderBy('date', 'desc'), limit(max));
    return collectionData(q, { idField: 'id' }) as Observable<UsageWithId[]>;
  }

  listByStudent(studentId: string, max = 20): Observable<UsageWithId[]> {
    const ref = collection(this.firestore, 'usages');
    const q = query(ref, where('studentId', '==', studentId), orderBy('date', 'desc'), limit(max));
    return collectionData(q, { idField: 'id' }) as Observable<UsageWithId[]>;
  }
}
