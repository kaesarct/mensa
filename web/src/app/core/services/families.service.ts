import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  docData,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { FamilyInput, FamilyWithId } from '../models/family.model';

@Injectable({ providedIn: 'root' })
export class FamiliesService {
  private readonly firestore = inject(Firestore);

  /** Lista non filtrata: accettata dalle rules solo per staff/sola_lettura. */
  listAll(): Observable<FamilyWithId[]> {
    const ref = collection(this.firestore, 'families');
    return collectionData(query(ref, orderBy('cognome')), { idField: 'id' }) as Observable<
      FamilyWithId[]
    >;
  }

  get(id: string): Observable<FamilyWithId | undefined> {
    return docData(doc(this.firestore, 'families', id), { idField: 'id' }) as Observable<
      FamilyWithId | undefined
    >;
  }

  async create(input: FamilyInput): Promise<string> {
    const ref = await addDoc(collection(this.firestore, 'families'), {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async update(id: string, input: FamilyInput): Promise<void> {
    await updateDoc(doc(this.firestore, 'families', id), {
      ...input,
      updatedAt: serverTimestamp(),
    });
  }
}
