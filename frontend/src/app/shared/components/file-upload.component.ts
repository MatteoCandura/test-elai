import { Component, inject, output, signal } from '@angular/core';
import FilesStore, { CsvFile } from '@store/files.store';
import AuthStore from '@store/auth.store';
import getHttpErrorMessage from '@utils/http-error';
import Icon from './icon.component';
import AlertComponent from './alert.component';

@Component({
  selector: 'app-file-upload',
  imports: [Icon, AlertComponent],
  template: `
    <div
      class="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
      [class.border-indigo-400]="isDragOver()"
      [class.border-gray-300]="!isDragOver()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave()"
      (drop)="onDrop($event)"
    >
      @if (filesStore.isUploading()) {
        <div class="space-y-4">
          <p class="text-sm">Upload in corso...</p>
          <progress
            class="progress progress-primary w-60"
            [value]="filesStore.uploadProgress()"
            max="100"
          ></progress>
          <p class="text-lg font-semibold text-primary">{{ filesStore.uploadProgress() }}%</p>
        </div>
      } @else if (!!errorMessage()) {
        <app-alert type="error" [show]="true">
          <p>{{ errorMessage() }}</p>
          <button
            (click)="errorMessage.set(null)"
            class="text-sm text-primary hover:text-primary/80 cursor-pointer"
          >
            Riprova
          </button>
        </app-alert>
      } @else {
        <div class="space-y-2">
          <input
            type="file"
            accept=".csv,.xls,.xlsx"
            multiple
            class="hidden"
            #fileInput
            (change)="onFileSelected($event)"
          />
          <div class="mx-auto w-fit">
            <app-icon name="upload" size="lg" checkTheme />
          </div>
          <p>Trascina i file CSV o Excel qui, oppure</p>
          <button class="btn btn-primary mt-2" (click)="fileInput.click()">Carica dei file</button>
        </div>
      }
    </div>
  `,
})
export default class FileUploadComponent {
  protected readonly filesStore = inject(FilesStore);
  private readonly authStore = inject(AuthStore);

  readonly uploaded = output<CsvFile>();

  protected errorMessage = signal<string | null>(null);
  protected isDragOver = signal(false);

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.uploadFiles(Array.from(input.files));
    }
  }

  // Drag & Drop handlers
  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  protected onDragLeave(): void {
    this.isDragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.uploadFiles(Array.from(files));
    }
  }

  private async uploadFiles(files: File[]): Promise<void> {
    const user = this.authStore.user();
    if (!user) {
      this.errorMessage.set('Devi autenticarti per caricare file.');
      return;
    }

    // Filtro per estensioni valide (CSV ed Excel)
    const allowed = ['.csv', '.xls', '.xlsx'];
    const validFiles = files.filter((f) =>
      allowed.some((ext) => f.name.toLowerCase().endsWith(ext)),
    );
    
    if (validFiles.length === 0) {
      this.errorMessage.set('Nessun file CSV o Excel valido selezionato.');
      return;
    }

    this.errorMessage.set(null);

    try {
      await this.filesStore.uploadFiles(validFiles, (csvFile) => {
        this.uploaded.emit({
          ...csvFile,
          uploadedBy: {
            email: user.email,
            name: user.name,
            _id: user.id,
          },
        });
      });
    } catch (err) {
      this.errorMessage.set(getHttpErrorMessage(err, "Errore durante l'upload dei file"));
    }
  }
}
