import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, limit, orderBy, query } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { MonthlyOrderWithId } from '../models/monthly-order.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly firestore = inject(Firestore);

  // Nessuna scrittura qui: l'invio/creazione dell'ordine passa dalla callable
  // sendSupplierOrder (garantisce l'unicità mensile in transazione).
  listRecent(max = 24): Observable<MonthlyOrderWithId[]> {
    const ref = collection(this.firestore, 'monthlyOrders');
    const q = query(ref, orderBy('year', 'desc'), orderBy('month', 'desc'), limit(max));
    return collectionData(q, { idField: 'id' }) as Observable<MonthlyOrderWithId[]>;
  }

  get(id: string): Observable<MonthlyOrderWithId | undefined> {
    return docData(doc(this.firestore, 'monthlyOrders', id), { idField: 'id' }) as Observable<
      MonthlyOrderWithId | undefined
    >;
  }
}
