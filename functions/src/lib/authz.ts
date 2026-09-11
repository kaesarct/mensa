import { HttpsError } from 'firebase-functions/v2/https';
import { Role } from '../types';

interface AuthLike {
  uid: string;
  token: Record<string, unknown>;
}

export function requireRole(auth: AuthLike | undefined, roles: Role[]): AuthLike {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Login richiesto.');
  }
  const role = auth.token['role'] as Role | undefined;
  if (!role || !roles.includes(role)) {
    throw new HttpsError('permission-denied', `Ruolo non autorizzato: richiesto uno tra ${roles.join(', ')}.`);
  }
  return auth;
}

export function requireStaff(auth: AuthLike | undefined): AuthLike {
  return requireRole(auth, ['admin', 'operatore']);
}

export function requireAdmin(auth: AuthLike | undefined): AuthLike {
  return requireRole(auth, ['admin']);
}
