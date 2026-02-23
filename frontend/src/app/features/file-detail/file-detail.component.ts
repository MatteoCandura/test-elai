import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  input,
  effect,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import AuthStore from '@store/auth.store';
import FilesStore, { FileColumn } from '@store/files.store';
import CsvPreviewComponent from '@components/csv-preview.component';
import ColumnTypeSelectorComponent from './column-type-selector.component';
import Icon from '@components/icon.component';
import AlertComponent from '@components/alert.component';
import formatSize from '@core/utils/file-size';

@Component({
  selector: 'app-file-detail',
  host: {
    class: 'relative',
  },
  imports: [
    DatePipe,
    DecimalPipe,
    CsvPreviewComponent,
    ColumnTypeSelectorComponent,
    Icon,
    AlertComponent,
  ],
  template: `
    @if (filesStore.loading()) {
      <p>Caricamento dettagli file...</p>
    } @else if (filesStore.selectedFile()) {
      @if (successMessage() || errorMessage()) {
        <div class="absolute top-0 z-10 space-y-2 w-full">
          <app-alert
            type="success"
            [show]="!!successMessage()"
            (onHide)="successMessage.set(null)"
            >{{ successMessage() }}</app-alert
          >
          <app-alert type="error" [show]="!!errorMessage()" (onHide)="errorMessage.set(null)">{{
            errorMessage()
          }}</app-alert>
        </div>
      }

      <div class="space-y-8">
        <button (click)="goBack()" class="btn btn-soft">
          <app-icon name="back" size="sm" checkTheme />
          Torna alla lista
        </button>

        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">
            {{ filesStore.selectedFile()!.originalName }}
          </h1>
          <button (click)="download()" class="btn btn-primary">
            <app-icon name="download" size="sm" />
            Scarica {{ fileType() }}
          </button>
        </div>

        <div class="space-y-4">
          <div class="card bg-base-100 shadow-md">
            <div class="card-body">
              <h2 class="card-title">Informazioni generali</h2>
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
                <div class="flex flex-col gap-1 rounded-lg bg-base-200 p-3">
                  <span class="text-xs uppercase text-base-content/50">Autore</span>
                  <span class="font-semibold text-base">{{
                    filesStore.selectedFile()!.uploadedBy?.name
                  }}</span>
                </div>
                <div class="flex flex-col gap-1 rounded-lg bg-base-200 p-3">
                  <span class="text-xs uppercase text-base-content/50">Tipo di file</span>
                  <span class="font-semibold text-base">{{ fileType() }}</span>
                </div>
                <div class="flex flex-col gap-1 rounded-lg bg-base-200 p-3">
                  <span class="text-xs uppercase text-base-content/50">Dimensione</span>
                  <span class="font-semibold text-base">{{
                    formatSize(filesStore.selectedFile()!.fileSize)
                  }}</span>
                </div>
                <div class="flex flex-col gap-1 rounded-lg bg-base-200 p-3">
                  <span class="text-xs uppercase text-base-content/50">Data upload</span>
                  <span class="font-semibold text-base">{{
                    filesStore.selectedFile()!.createdAt | date: 'dd/MM/yyyy HH:mm'
                  }}</span>
                </div>
                <div class="flex flex-col gap-1 rounded-lg bg-base-200 p-3">
                  <span class="text-xs uppercase text-base-content/50">Righe totali</span>
                  <span class="font-semibold text-base">{{
                    filesStore.selectedFile()!.rowCount | number
                  }}</span>
                </div>
                <div class="flex flex-col gap-1 rounded-lg bg-base-200 p-3">
                  <span class="text-xs uppercase text-base-content/50">Colonne totali</span>
                  <span class="font-semibold text-base">{{
                    filesStore.selectedFile()!.columns.length | number
                  }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="card bg-base-100 shadow-md">
            <div class="card-body">
              <h2 class="card-title">Tipi colonna</h2>
              <app-column-type-selector
                [columns]="filesStore.selectedFile()!.columns"
                (columnChanged)="onColumnChanged($event)"
                [readonly]="!canEdit()"
              />

              @if (canEdit()) {
                <button
                  (click)="saveColumns()"
                  [disabled]="isSaving()"
                  class="btn btn-primary ml-auto mr-3 mt-3 block"
                >
                  <div class="flex items-center gap-2">
                    @if (isSaving()) {
                      <span>Salvataggio...</span>
                    } @else {
                      <app-icon name="save" size="sm" />
                      <span>Salva</span>
                    }
                  </div>
                </button>
              }
            </div>
          </div>
        </div>

        <div>
          <h2 class="text-lg font-semibold mb-4">Anteprima dati (prime 100 righe)</h2>
          <app-csv-preview
            [columns]="filesStore.selectedFile()!.columns"
            [rows]="filesStore.selectedFile()!.previewData"
          />
        </div>
      </div>
    } @else {
      <p class="text-red-500">File non trovato.</p>
    }
  `,
})
export default class FileDetailComponent implements OnInit {
  protected readonly filesStore = inject(FilesStore);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  readonly id = input<string>('');

  protected isSaving = signal(false);
  protected successMessage = signal<string | null>(null);
  protected errorMessage = signal<string | null>(null);

  protected formatSize = formatSize;

  // Tipi originali per capire se l'utente ha effettivamente cambiato qualcosa
  private originalColumnTypes: Record<string, string> = {};

  protected fileType = computed(() => {
    const file = this.filesStore.selectedFile();
    if (!file) return '';
    return file.originalName.includes('.csv') ? 'CSV' : 'Excel';
  });

  protected canEdit = computed(() => {
    const file = this.filesStore.selectedFile();
    if (!file) return false;
    return this.authStore.canEditAll() || file.uploadedBy?._id === this.authStore.user()?.id;
  });

  constructor() {
    // Sincronizzo i tipi originali quando il file viene caricato
    effect(() => {
      const file = this.filesStore.selectedFile();
      if (file && file._id === this.id()) {
        untracked(() => {
          this.originalColumnTypes = Object.fromEntries(
            file.columns.map((c) => [c.name, c.assignedType]),
          );
        });
      }
    });
  }

  ngOnInit(): void {
    this.filesStore.loadFile(this.id());
  }

  protected onColumnChanged(column: FileColumn): void {
    const changes = { ...this.originalColumnTypes };

    // Se il tipo torna quello originale, rimuovo la modifica pendente
    if (column.assignedType === this.originalColumnTypes[column.name]) {
      delete changes[column.name];
    } else {
      changes[column.name] = column.assignedType;
    }

    this.successMessage.set('');
  }

  protected saveColumns(): void {
    const current = this.filesStore.selectedFile();
    if (!current) return;

    this.isSaving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const changes = this.originalColumnTypes;
    const updatedColumns = current.columns.map((c) =>
      changes[c.name] ? { ...c, assignedType: changes[c.name] as FileColumn['assignedType'] } : c,
    );

    this.filesStore.updateColumns(current._id, updatedColumns).subscribe((success) => {
      this.isSaving.set(false);
      if (success) {
        this.successMessage.set('Modifiche salvate!');
        setTimeout(() => this.successMessage.set(''), 3000);
      } else {
        this.errorMessage.set('Errore durante il salvataggio.');
      }
    });
  }

  protected goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  protected download(): void {
    const file = this.filesStore.selectedFile();
    if (file) {
      this.filesStore.downloadFile(file._id, file.originalName).subscribe();
    }
  }
}
