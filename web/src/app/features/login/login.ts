import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);

  async submit(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.authService.login(this.email, this.password);
      await this.router.navigate(['/students']);
    } catch {
      this.error.set('Credenziali non valide.');
    } finally {
      this.loading.set(false);
    }
  }
}
