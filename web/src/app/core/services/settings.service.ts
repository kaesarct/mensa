import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Settings } from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly firestore = inject(Firestore);
  private readonly ref = doc(this.firestore, 'settings', 'global');

  get(): Observable<Settings | undefined> {
    return docData(this.ref) as Observable<Settings | undefined>;
  }

  async update(settings: Settings): Promise<void> {
    await updateDoc(this.ref, { ...settings });
  }
}
