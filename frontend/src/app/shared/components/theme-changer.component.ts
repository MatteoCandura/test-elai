import { Component, signal, computed, AfterViewInit } from '@angular/core';
import Icon from './icon.component';

@Component({
  selector: 'app-theme-changer',
  imports: [Icon],
  template: `
    <div
      class="fixed bottom-6 right-6 z-50 bg-base-100 hover:bg-base-300 p-2 rounded-full shadow-lg"
    >
      <button
        class="w-10 h-10 flex items-center justify-center cursor-pointer"
        (click)="toggleTheme()"
      >
        <app-icon [name]="isDark() ? 'sun' : 'moon'" />
      </button>
    </div>
  `,
})
export default class ThemeChangerComponent implements AfterViewInit {
  private theme = signal<string>('light');

  protected readonly isDark = computed(() => this.theme() === 'dark');

  ngAfterViewInit(): void {
    const saved = localStorage.getItem('theme');
    const theme =
      saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    this.applyTheme(theme);
  }

  protected toggleTheme(): void {
    this.applyTheme(this.isDark() ? 'light' : 'dark');
  }

  private applyTheme(theme: string): void {
    this.theme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
}
