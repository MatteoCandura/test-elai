import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import getHttpErrorMessage from '@utils/http-error';
import AlertComponent from '@components/alert.component';
import AuthStore from '@store/auth.store';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, AlertComponent],
  template: `
    <div class="flex justify-center items-center h-screen">
      <div>
        <h2 class="text-primary text-3xl text-center mb-2">CSV Manager</h2>
        <div class="card bg-base-300 p-8 w-10/12 lg:w-md mx-auto lg:mx-0">
          <h2 class="text-2xl font-bold mb-6">Registrati</h2>
          <app-alert [show]="errorMessage().length > 0" type="error">{{
            errorMessage()
          }}</app-alert>
          <form (ngSubmit)="onSubmit()">
            <div class="mb-4">
              <label class="block text-sm font-medium mb-1">Nome</label>
              <input type="text" [(ngModel)]="name" name="name" class="w-full input" required />
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium mb-1">Email</label>
              <input type="email" [(ngModel)]="email" name="email" class="w-full input" required />
            </div>
            <div class="mb-6">
              <label class="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                minlength="8"
                class="w-full input"
                required
              />
              <p class="text-xs italic mt-1">Minimo 8 caratteri</p>
            </div>
            <button type="submit" [disabled]="isLoading()" class="btn btn-primary mx-auto block">
              @if (isLoading()) {
                Registrazione in corso...
              } @else {
                Registrati
              }
            </button>
          </form>
          <p class="mt-4 text-center text-sm">
            Hai già un account?
            <a routerLink="/login" class="text-primary hover:text-primary/80">Accedi</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export default class RegisterComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  protected name = '';

  protected email = '';
  protected password = '';
  protected errorMessage = signal('');
  protected isLoading = signal(false);

  onSubmit(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authStore.register(this.email, this.password, this.name).subscribe((success) => {
      this.isLoading.set(false);
      if (success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage.set(this.authStore.error() || 'Registrazione fallita');
      }
    });
  }
}
