import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';

interface NavLink {
  path: string;
  label: string;
}

const NAV_BY_ROLE: Record<string, NavLink[]> = {
  admin: [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/students', label: 'Alunni' },
    { path: '/families', label: 'Famiglie' },
    { path: '/top-ups', label: 'Ricariche' },
    { path: '/usages', label: 'Utilizzi' },
    { path: '/supplier-order', label: 'Ordine Mensa' },
    { path: '/settings', label: 'Impostazioni' },
  ],
  operatore: [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/students', label: 'Alunni' },
    { path: '/families', label: 'Famiglie' },
    { path: '/top-ups', label: 'Ricariche' },
    { path: '/usages', label: 'Utilizzi' },
    { path: '/supplier-order', label: 'Ordine Mensa' },
  ],
  sola_lettura: [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/students', label: 'Alunni' },
    { path: '/families', label: 'Famiglie' },
  ],
  famiglia: [{ path: '/students', label: 'I miei figli' }],
};

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly claims = this.authService.claims;

  protected readonly navLinks = computed<NavLink[]>(() => {
    const role = this.claims().role;
    return role ? (NAV_BY_ROLE[role] ?? []) : [];
  });

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
