import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, map, pipe, switchMap, tap, filter, EMPTY, Observable, of } from 'rxjs';
import { HttpClient, HttpEventType, HttpRequest, HttpResponse } from '@angular/common/http';
import getHttpErrorMessage from '@utils/http-error';

export interface FileColumn {
  name: string;
  suggestedType: 'text' | 'number' | 'date';
  assignedType: 'text' | 'number' | 'date';
}

export interface CsvFile {
  _id: string;
  originalName: string;
  fileSize: number;
  uploadedBy: { _id: string; name: string; email: string } | null;
  columns: FileColumn[];
  rowCount: number;
  previewData: string[][];
  createdAt: string;
  updatedAt: string;
}

interface FilesState {
  files: CsvFile[];
  selectedFile: CsvFile | null;
  loading: boolean;
  error: string | null;
  searchTerm: string;
  uploadProgress: number;
  isUploading: boolean;
}

const initialState: FilesState = {
  files: [],
  selectedFile: null,
  loading: false,
  error: null,
  searchTerm: '',
  uploadProgress: 0,
  isUploading: false,
};

const FilesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((state) => ({
    // Filtro client-side per la ricerca rapida in tabella
    filteredFiles: computed(() => {
      const term = state.searchTerm().toLowerCase().trim();
      if (!term) return state.files();
      return state.files().filter((f) => f.originalName.toLowerCase().includes(term));
    }),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const apiUrl = '/api/files';

    return {
      setSearchTerm: (searchTerm: string) => patchState(store, { searchTerm }),

      // Caricamento iniziale di tutti i file
      loadFiles: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null })),
          switchMap(() =>
            http.get<{ files: CsvFile[] }>(apiUrl).pipe(
              tap((res) => patchState(store, { files: res.files, loading: false })),
              catchError((err) => {
                patchState(store, {
                  loading: false,
                  error: getHttpErrorMessage(err, 'Errore nel caricamento file'),
                });
                return EMPTY;
              }),
            ),
          ),
        ),
      ),

      // Dettaglio singolo file (usato nella rotta files/:id)
      loadFile: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { loading: true, error: null, selectedFile: null })),
          switchMap((id) =>
            http.get<{ file: CsvFile }>(`${apiUrl}/${id}`).pipe(
              tap((res) => patchState(store, { selectedFile: res.file, loading: false })),
              catchError((err) => {
                patchState(store, {
                  loading: false,
                  error: getHttpErrorMessage(err, 'Errore nel caricamento file'),
                });
                return EMPTY;
              }),
            ),
          ),
        ),
      ),

      // Gestione upload multiplo con tracking del progresso
      async uploadFiles(files: File[], onFileUploaded?: (file: CsvFile) => void): Promise<CsvFile[]> {
        patchState(store, { isUploading: true, uploadProgress: 0, error: null });

        const results: CsvFile[] = [];
        const totalFiles = files.length;

        try {
          for (let i = 0; i < totalFiles; i++) {
            const file = files[i];
            const baseProgress = (i / totalFiles) * 100;

            const formData = new FormData();
            formData.append('file', file);
            
            const req = new HttpRequest('POST', `${apiUrl}/upload`, formData, {
              reportProgress: true,
            });

            await new Promise<void>((resolve, reject) => {
              http.request(req).pipe(
                filter(e => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
                map(event => {
                  if (event.type === HttpEventType.UploadProgress && event.total) {
                    return { type: 'progress' as const, progress: Math.round((100 * event.loaded) / event.total) };
                  }
                  const res = event as HttpResponse<{ file: CsvFile }>;
                  return { type: 'complete' as const, progress: 100, file: res.body!.file };
                })
              ).subscribe({
                next: (event) => {
                  if (event.type === 'progress') {
                    const currentFileProgress = event.progress / totalFiles;
                    patchState(store, { uploadProgress: Math.round(baseProgress + currentFileProgress) });
                  } else if (event.type === 'complete' && event.file) {
                    results.push(event.file);
                    patchState(store, { 
                      files: [event.file, ...store.files()],
                      uploadProgress: Math.round(((i + 1) / totalFiles) * 100)
                    });
                    onFileUploaded?.(event.file);
                    resolve();
                  }
                },
                error: (err) => reject(err)
              });
            });
          }
          patchState(store, { isUploading: false, uploadProgress: 100 });
          return results;
        } catch (err) {
          patchState(store, {
            isUploading: false,
            uploadProgress: 0,
            error: getHttpErrorMessage(err, "Errore durante l'upload"),
          });
          throw err;
        }
      },

      updateColumns(id: string, columns: FileColumn[]): Observable<boolean> {
        patchState(store, { error: null });
        return http.put<{ file: CsvFile }>(`${apiUrl}/${id}/columns`, { columns }).pipe(
          map((res) => {
            const updated = res.file;
            patchState(store, {
              selectedFile: updated,
              files: store.files().map((f) => (f._id === id ? updated : f)),
            });
            return true;
          }),
          catchError((err) => {
            patchState(store, { error: getHttpErrorMessage(err, 'Errore durante il salvataggio') });
            return of(false);
          }),
        );
      },

      deleteFile(id: string): Observable<boolean> {
        patchState(store, { error: null });
        return http.delete<void>(`${apiUrl}/${id}`).pipe(
          map(() => {
            patchState(store, { files: store.files().filter((f) => f._id !== id) });
            return true;
          }),
          catchError((err) => {
            patchState(store, { error: getHttpErrorMessage(err, "Errore durante l'eliminazione") });
            return of(false);
          }),
        );
      },

      downloadFile(id: string, filename: string): Observable<boolean> {
        patchState(store, { error: null });
        return http.get(`${apiUrl}/${id}/download`, { responseType: 'blob' }).pipe(
          map((blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
            return true;
          }),
          catchError((err) => {
            patchState(store, { error: getHttpErrorMessage(err, 'Errore durante il download') });
            return of(false);
          }),
        );
      },
    };
  }),
);

export default FilesStore;
