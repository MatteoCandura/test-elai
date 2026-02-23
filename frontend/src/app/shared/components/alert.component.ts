import { Component, effect, input, output, signal, untracked } from '@angular/core';
import Icon from './icon.component';

@Component({
  selector: 'app-alert',
  imports: [Icon],
  styleUrl: './alert.component.css',
  template: `
    @if (visible()) {
      <div
        role="alert"
        class="alert mb-2"
        [class.fade-in-top]="!isClosing()"
        [class.fade-out-top]="isClosing()"
        [class.alert-success]="type() === 'success'"
        [class.alert-error]="type() === 'error'"
        [class.alert-warning]="type() === 'warning'"
      >
        <app-icon [name]="type()" checkTheme />
        <div>
          <ng-content />
        </div>
      </div>
    }
  `,
})
export default class AlertComponent {
  readonly show = input<boolean>(true);

  readonly type = input.required<'success' | 'error' | 'warning'>();

  readonly onHide = output<void>();

  protected readonly visible = signal(false);

  protected readonly isClosing = signal(false);

  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  private removeTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Inizializza i signal e gli effetti.
   * Con un effect gestisce la visibilità dell'alert e lo fa scomparire dopo 6 secondi.
   */
  constructor() {
    effect(() => {
      const isShown = this.show();
      untracked(() => {
        if (isShown) {
          this.visible.set(true);
          this.isClosing.set(false);

          if (this.removeTimeout) {
            clearTimeout(this.removeTimeout);
            this.removeTimeout = null;
          }

          if (this.hideTimeout) clearTimeout(this.hideTimeout);
          this.hideTimeout = setTimeout(() => this.closeAlert(), 6000);
        } else {
          if (this.visible()) {
            this.closeAlert();
          }
        }
      });
    });
  }

  private closeAlert(): void {
    this.isClosing.set(true);

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    if (!this.removeTimeout) {
      this.removeTimeout = setTimeout(() => {
        this.visible.set(false);
        this.isClosing.set(false);
        this.removeTimeout = null;
        setTimeout(() => this.onHide.emit(), 500); // dopo mezzo secondo emetto l'evento onHide per permettere al componente padre di rimuovere l'alert dal DOM
      }, 700); // 700ms corrisponde alla durata di fade-out-top (0.7s)
    }
  }
}
