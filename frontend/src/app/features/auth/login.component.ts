import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import AlertComponent from '@components/alert.component';
import AuthStore from '@store/auth.store';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, AlertComponent],
  template: `
    <div class="flex justify-center items-center h-screen">
      <div>
        <h2 class="text-primary text-3xl text-center mb-2">CSV Manager</h2>
        <div class="card bg-base-300 p-8 w-10/12 lg:w-md mx-auto lg:mx-0">
          <h2 class="text-2xl font-bold mb-6">Accedi</h2>
          <app-alert [show]="errorMessage().length > 0" type="error">{{ errorMessage() }}</app-alert>
          <form (ngSubmit)="onSubmit()">
            <div class="mb-4">
              <label class="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                [(ngModel)]="email"
                autocomplete="email"
                name="email"
                class="input w-full"
                required
              />
            </div>
            <div class="mb-6">
              <label class="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                [(ngModel)]="password"
                autocomplete="current-password"
                name="password"
                class="input w-full"
                required
              />
            </div>
            <button type="submit" [disabled]="isLoading()" class="btn btn-primary mx-auto block">
              @if (isLoading()) {
                Accesso in corso...
              } @else {
                Accedi
              }
            </button>
          </form>
          <p class="mt-4 text-center text-sm">
            Non hai un account?
            <a routerLink="/register" class="text-primary hover:text-primary/80">Registrati</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export default class LoginComponent implements OnInit {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected email = '';
  protected password = '';
  protected errorMessage = signal('');
  protected isLoading = signal(false);

  ngOnInit(): void {
    if (this.authStore.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authStore.login(this.email, this.password).subscribe((success) => {
      this.isLoading.set(false);
      if (success) {
        // Redirigo alla rotta originale se presente, altrimenti alla dashboard
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      } else {
        this.errorMessage.set(this.authStore.error() || 'Credenziali non valide');
      }
    });
  }
}
