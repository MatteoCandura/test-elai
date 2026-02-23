import { Component, inject, signal } from '@angular/core';
import Icon from './icon.component';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import AuthStore from '@store/auth.store';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, Icon],
  template: `
    <div class="navbar bg-base-100 shadow-sm px-4">
      <div class="navbar-start">
        <a class="text-primary text-xl font-semibold cursor-pointer" routerLink="/dashboard"
          >CSV Manager</a
        >
      </div>
      <div class="navbar-center flex gap-4">
        @if (authStore.canManageUsers()) {
          <a
            routerLink="/dashboard"
            class="text-medium cursor-pointer hover:text-primary"
            [class.text-primary]="currentUrl() === '/dashboard' || currentUrl().includes('files')"
            >Gestione file</a
          >
          <a
            routerLink="/users"
            class="text-medium cursor-pointer hover:text-primary"
            [class.text-primary]="currentUrl() === '/users'"
            >Utenti</a
          >
        }
      </div>
      <div class="navbar-end">
        <div class="flex items-center gap-4">
          <span class="font-medium text-sm">{{ authStore.user()?.name }}</span>
          <button
            (click)="authStore.logout()"
            class="tooltip tooltip-bottom cursor-pointer"
            data-tip="Esci"
          >
            <app-icon name="logout" size="md" />
          </button>
        </div>
      </div>
    </div>
  `,
})
export default class NavbarComponent {
  protected readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  protected currentUrl = signal<string>('');

  constructor() {
    this.currentUrl.set(this.router.url);
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.url);
      }
    });
  }
}
