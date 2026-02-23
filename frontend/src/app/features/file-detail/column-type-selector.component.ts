import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileColumn } from '@core/store/files.store';
import { suggestionLabel, typeOptions } from '@core/utils/field-name';
import { NgSelectComponent } from '@ng-select/ng-select';

@Component({
  selector: 'app-column-type-selector',
  imports: [FormsModule, NgSelectComponent],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      @for (col of columns(); track col.name) {
        <div class="flex items-center gap-4 p-3 border border-base-content/10 rounded-lg">
          <div class="flex-1 min-w-0">
            <span class="font-medium">{{ col.name }}</span>
            @if (col.suggestedType !== col.assignedType) {
              <span class="ml-2 text-xs text-amber-600">
                (suggerito: {{ suggestionLabel(col.suggestedType) }})
              </span>
            }
          </div>
          <div class="w-48 shrink-0 tooltip tooltip-left" [attr.data-tip]="tooltipText()">
            <ng-select
              [readonly]="readonly()"
              [items]="typeOptions"
              bindLabel="label"
              bindValue="value"
              [(ngModel)]="col.assignedType"
              (ngModelChange)="columnChanged.emit(col)"
              [clearable]="false"
              [searchable]="false"
            >
            </ng-select>
          </div>
        </div>
      }
    </div>
  `,
})
export default class ColumnTypeSelectorComponent {
  readonly columns = input<FileColumn[]>([]);
  readonly columnChanged = output<FileColumn>();
  readonly readonly = input.required<boolean>();
  protected readonly tooltipText = computed(() =>
    this.readonly() ? 'Non puoi modificare il tipo colonna' : 'Modifica tipo colonna',
  );

  protected typeOptions = typeOptions;

  protected suggestionLabel = suggestionLabel;
}
