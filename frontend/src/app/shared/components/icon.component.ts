import { Component, input, computed, booleanAttribute } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-icon',
  template: `<img [src]="path()" [alt]="name()" [class]="sizeClass()" />`,
})
export default class Icon {
  readonly name = input.required<string>();

  readonly size = input<'sm' | 'md' | 'lg'>('md');

  readonly checkTheme = input(false, { transform: booleanAttribute });

  /**
   * Signal con il tema attuale ("light" o "dark").
   * Ho utilizzato toSignal per creare un segnale reattivo che si aggiorna quando il tema cambia.
   *
   * @returns string
   * @private
   */
  private readonly theme = toSignal(
    new Observable<string>((subscriber) => {
      const el = document.documentElement;
      subscriber.next(el.getAttribute('data-theme') ?? 'light');
      const observer = new MutationObserver(() =>
        subscriber.next(el.getAttribute('data-theme') ?? 'light'),
      );
      observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
      return () => observer.disconnect();
    }),
    { initialValue: 'light' },
  );

  protected readonly path = computed(() => {
    if (this.checkTheme()) {
      return `/icons/${this.name()}-${this.theme()}.svg`;
    }
    return `/icons/${this.name()}.svg`;
  });

  protected readonly sizeClass = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'w-4 h-4 max-w-4 max-h-4';
      case 'md':
        return 'w-8 h-8 max-w-8 max-h-8';
      case 'lg':
        return 'w-16 h-16 max-w-16 max-h-16';
    }
  });
}
