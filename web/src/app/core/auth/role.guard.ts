import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { Role } from '../models/role.model';

export function roleGuard(allowedRoles: Role[]): CanActivateFn {
  return async () => {
    const auth = inject(Auth);
    const router = inject(Router);

    // user() emette una sola volta risolto lo stato iniziale dell'auth SDK:
    // evita redirect prematuri al login durante il caricamento della pagina.
    const currentUser = await firstValueFrom(user(auth));
    if (!currentUser) {
      return router.createUrlTree(['/login']);
    }

    const token = await currentUser.getIdTokenResult();
    const role = token.claims['role'] as Role | undefined;
    if (!role || !allowedRoles.includes(role)) {
      return router.createUrlTree(['/login']);
    }
    return true;
  };
}
