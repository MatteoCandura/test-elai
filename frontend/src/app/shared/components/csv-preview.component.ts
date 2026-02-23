import { Component, computed, input, signal } from '@angular/core';
import { suggestionLabel } from '@core/utils/field-name';
import { FileColumn } from '@store/files.store';

@Component({
  selector: 'app-csv-preview',
  template: `
    <input
      type="search"
      placeholder="Cerca tra i dati..."
      class="input input-bordered input-sm w-full max-w-xs mb-4"
      [value]="searchTerm()"
      (input)="onSearch($event)"
    />

    <div
      class="shadow-sm overflow-x-auto rounded-box border border-base-content/5 bg-base-100 max-h-[500px] overflow-y-auto"
    >
      <table class="table table-zebra table-pin-rows">
        <thead>
          <tr>
            @for (col of columns(); track col.name) {
              <th>
                <div class="flex flex-col">
                  <span>{{ col.name }}</span>
                  <span class="text-[10px] font-normal opacity-50">{{
                    suggestionLabel(col.suggestedType)
                  }}</span>
                </div>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of filteredRows(); track $index) {
            <tr>
              @for (cell of row; track $index) {
                <td class="whitespace-nowrap">{{ cell }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (filteredRows().length === 0) {
      <p class="text-center py-8 text-base-content/50 italic">
        Nessun dato corrispondente alla ricerca.
      </p>
    }
  `,
})
export default class CsvPreviewComponent {
  readonly columns = input<FileColumn[]>([]);
  readonly rows = input<string[][]>([]);

  protected searchTerm = signal('');

  protected suggestionLabel = suggestionLabel;

  protected filteredRows = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.rows();

    return this.rows().filter((row) => row.some((cell) => cell?.toLowerCase().includes(term)));
  });

  onSearch(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
  }
}
