import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import ThemeChangerComponent from '@components/theme-changer.component';
import NavbarComponent from "@components/navbar.component";
import AuthStore from '@store/auth.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ThemeChangerComponent, NavbarComponent],
  template: `
    @if (authStore.isLoggedIn()) {
      <app-navbar />
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <router-outlet />
      </main>
    } @else {
      <router-outlet />
    }
    <app-theme-changer />
  `,
})
export class App {
  protected authStore = inject(AuthStore);
}
