import { Injectable, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Role } from '../models/role.model';

export interface Claims {
  role: Role | null;
  familyId: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);

  readonly currentUser = toSignal(user(this.auth), { initialValue: null });
  readonly claims = signal<Claims>({ role: null, familyId: null });

  constructor() {
    effect(() => {
      const u = this.currentUser();
      if (!u) {
        this.claims.set({ role: null, familyId: null });
        return;
      }
      // idTokenResult non è reattivo: si aggiorna una volta al cambio utente.
      // Sufficiente per lo scaffold — un refresh dei claims post-login richiede
      // un getIdToken(true) esplicito, da aggiungere in Fase 3 se necessario.
      u.getIdTokenResult().then((token) => {
        this.claims.set({
          role: (token.claims['role'] as Role) ?? null,
          familyId: (token.claims['familyId'] as string) ?? null,
        });
      });
    });
  }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout() {
    return signOut(this.auth);
  }
}
