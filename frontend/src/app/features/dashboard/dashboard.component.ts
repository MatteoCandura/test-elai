import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import AuthStore from '@store/auth.store';
import FilesStore, { CsvFile } from '@store/files.store';
import FileUploadComponent from '@components/file-upload.component';
import Icon from '@components/icon.component';
import AlertComponent from '@components/alert.component';
import formatSize from '@utils/file-size';

@Component({
  selector: 'app-dashboard',
  host: {
    class: 'relative',
  },
  imports: [RouterLink, DatePipe, DecimalPipe, FileUploadComponent, Icon, AlertComponent],
  template: `
    @if (uploadedFiles().length > 0 || deletedFileMessage()) {
      <div class="space-y-4 absolute top-0 z-10 w-full">
        @for (file of uploadedFiles(); track file._id) {
          <app-alert type="success" class="mx-auto block" (onHide)="hideAlert(file._id)">
            <p>
              Hai caricato correttamente il file <strong>{{ file.originalName }}</strong
              >.<br />
              Pesa <strong>{{ formatSize(file.fileSize) }}</strong
              >, ha <strong>{{ file.columns.length }}</strong> colonne.
            </p>
          </app-alert>
        }

        @if (deletedFileMessage()) {
          <app-alert type="success" (onHide)="deletedFileMessage.set(null)">
            <div [innerHTML]="deletedFileMessage()!"></div>
          </app-alert>
        }
      </div>
    }

    <div class="space-y-8">
      <div>
        <h1 class="text-2xl font-bold mb-4">Carica file CSV o Excel</h1>
        <app-file-upload (uploaded)="onFileUploaded($event)" />
      </div>

      <div>
        <h2 class="text-xl font-bold mb-4">I tuoi file</h2>

        @if (filesStore.loading()) {
          <p class="text-gray-500">Caricamento file...</p>
        } @else if (filesStore.files().length === 0) {
          <p class="text-gray-500">Nessun file caricato.</p>
        } @else {
          <div class="mb-4">
            <input
              type="search"
              placeholder="Cerca file..."
              class="input input-bordered input-sm w-full max-w-xs"
              [value]="filesStore.searchTerm()"
              (input)="onSearchInput($event)"
            />
          </div>

          <div
            class="shadow-sm overflow-x-auto rounded-box border border-base-content/5 bg-base-100"
          >
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Dimensione</th>
                  <th>Colonne</th>
                  <th>Righe</th>
                  <th>Caricato il</th>
                  <th>Caricato da</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                @for (file of filesStore.filteredFiles(); track file._id) {
                  <tr>
                    <td>
                      <a
                        [routerLink]="['/files', file._id]"
                        class="text-primary hover:text-primary/80 font-medium tooltip tooltip-right"
                        data-tip="Visualizza dettagli"
                      >
                        {{ file.originalName }}
                      </a>
                    </td>
                    <td>{{ formatSize(file.fileSize) }}</td>
                    <td>{{ file.columns.length }}</td>
                    <td>{{ file.rowCount | number }}</td>
                    <td>{{ file.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                    <td>{{ file.uploadedBy?.name || 'N/A' }}</td>
                    <td>
                      <div class="flex gap-2">
                        @if (canDelete(file)) {
                          <button
                            (click)="deleteFile(file)"
                            class="cursor-pointer tooltip tooltip-left"
                            data-tip="Elimina"
                          >
                            <app-icon name="delete" size="sm" />
                          </button>
                        }
                        <button
                          (click)="downloadFile(file._id, file.originalName)"
                          class="cursor-pointer tooltip tooltip-left"
                          data-tip="Scarica"
                        >
                          <app-icon name="download-primary" size="sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
})
export default class DashboardComponent implements OnInit {
  protected readonly filesStore = inject(FilesStore);
  private readonly authStore = inject(AuthStore);

  // Per mostrare un feedback immediato dopo l'upload in questa sessione
  protected uploadedFiles = signal<CsvFile[]>([]);
  protected deletedFileMessage = signal<string | null>(null);

  protected readonly formatSize = formatSize;

  ngOnInit(): void {
    this.filesStore.loadFiles();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filesStore.setSearchTerm(value);
  }

  onFileUploaded(file: CsvFile): void {
    this.uploadedFiles.update((files) => [...(files || []), file]);
  }

  // Verifica se l'utente può eliminare il file (admin o proprietario)
  canDelete(file: CsvFile): boolean {
    const user = this.authStore.user();
    return this.authStore.canDeleteAll() || file.uploadedBy?._id === user?.id;
  }

  deleteFile(file: CsvFile): void {
    if (!confirm(`Sei sicuro di voler eliminare "${file.originalName}"?`)) return;

    this.filesStore.deleteFile(file._id).subscribe((success) => {
      if (success) {
        this.deletedFileMessage.set(`File <strong>${file.originalName}</strong> eliminato.`);
        setTimeout(() => this.deletedFileMessage.set(null), 5000);
      }
    });
  }

  downloadFile(id: string, name: string): void {
    this.filesStore.downloadFile(id, name).subscribe();
  }

  hideAlert(id: string): void {
    this.uploadedFiles.update((files) => files.filter((file) => file._id !== id));
  }
}
