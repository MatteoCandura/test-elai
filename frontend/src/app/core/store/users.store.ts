import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of, map, EMPTY, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import getHttpErrorMessage from '@utils/http-error';

export interface UserAdmin {
  _id: string;
  email: string;
  name: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

interface UsersState {
  users: UserAdmin[];
  error: string | null;
  searchTerm: string;
}

const initialState: UsersState = {
  users: [],
  error: null,
  searchTerm: '',
};

export const UsersStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((state) => ({
    // Filtro per la ricerca utenti in tabella
    filteredUsers: computed(() => {
      const term = state.searchTerm().toLowerCase().trim();
      if (!term) return state.users();
      return state.users().filter(
        (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
      );
    }),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const apiUrl = '/api/users';

    return {
      setSearchTerm: (term: string) => patchState(store, { searchTerm: term }),

      loadUsers: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { error: null })),
          switchMap(() =>
            http.get<{ users: UserAdmin[] }>(apiUrl).pipe(
              tap((res) => patchState(store, { users: res.users })),
              catchError((err) => {
                patchState(store, {
                  error: getHttpErrorMessage(err, 'Errore nel caricamento utenti'),
                });
                return EMPTY;
              }),
            ),
          ),
        ),
      ),

      updateUser(id: string, data: { name?: string; email?: string }): Observable<boolean> {
        patchState(store, { error: null });
        return http.put<{ user: UserAdmin }>(`${apiUrl}/${id}`, data).pipe(
          map((res) => {
            patchState(store, {
              users: store.users().map((u) => (u._id === id ? res.user : u)),
            });
            return true;
          }),
          catchError((err) => {
            patchState(store, { error: getHttpErrorMessage(err, "Errore aggiornamento utente") });
            return of(false);
          }),
        );
      },

      updatePermissions(id: string, permissions: string[]): Observable<boolean> {
        patchState(store, { error: null });
        return http.put<{ user: UserAdmin }>(`${apiUrl}/${id}/permissions`, { permissions }).pipe(
          map((res) => {
            patchState(store, {
              users: store.users().map((u) => (u._id === id ? res.user : u)),
            });
            return true;
          }),
          catchError((err) => {
            patchState(store, { error: getHttpErrorMessage(err, "Errore aggiornamento permessi") });
            return of(false);
          }),
        );
      },

      deleteUser(id: string): Observable<boolean> {
        patchState(store, { error: null });
        return http.delete<void>(`${apiUrl}/${id}`).pipe(
          map(() => {
            patchState(store, {
              users: store.users().filter((u) => u._id !== id),
            });
            return true;
          }),
          catchError((err) => {
            patchState(store, { error: getHttpErrorMessage(err, "Errore eliminazione utente") });
            return of(false);
          }),
        );
      },
    };
  }),
);
