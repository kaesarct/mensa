import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes } from '@angular/fire/storage';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly storage = inject(Storage);

  /** Path coerente con storage.rules: topUpDocuments/{familyId}/{fileName}. */
  async uploadTopUpDocument(familyId: string, file: File): Promise<string> {
    const path = `topUpDocuments/${familyId}/${Date.now()}-${file.name}`;
    await uploadBytes(ref(this.storage, path), file);
    return path;
  }
}
