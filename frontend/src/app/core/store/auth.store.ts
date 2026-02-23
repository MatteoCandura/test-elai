import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { catchError, map, of, Observable } from 'rxjs';
import getHttpErrorMessage from '@utils/http-error';

export interface User {
  id: string;
  email: string;
  name: string;
  permissions: string[];
}

interface AuthResponse {
  token: string;
  user: User;
}

interface AuthState {
  user: User | null;
  token: string | null;
  error: string | null;
}

// Recupero i dati salvati per evitare il flash di "non loggato" al refresh della pagina
function loadFromStorage(): Pick<AuthState, 'user' | 'token'> {
  try {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    if (token && userJson) {
      return { token, user: JSON.parse(userJson) };
    }
  } catch (e) {
    // Se il JSON è corrotto o il token è scaduto, pulisco tutto per sicurezza
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  return { token: null, user: null };
}

const stored = loadFromStorage();

const initialState: AuthState = {
  user: stored.user,
  token: stored.token,
  error: null,
};

const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ user }) => ({
    isLoggedIn: computed(() => user() !== null),
    
    // Shortcut rapidi per i permessi globali dell'utente
    canViewAll: computed(() => user()?.permissions.includes('view_all') ?? false),
    canDeleteAll: computed(() => user()?.permissions.includes('delete_all') ?? false),
    canEditAll: computed(() => user()?.permissions.includes('edit_all') ?? false),
    canManageUsers: computed(() => user()?.permissions.includes('manage_users') ?? false),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const router = inject(Router);
    const apiUrl = '/api/auth';

    const persistAuth = (response: AuthResponse) => {
      patchState(store, {
        token: response.token,
        user: response.user,
        error: null,
      });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    };

    return {
      login(email: string, password: string): Observable<boolean> {
        patchState(store, { error: null });
        
        return http.post<AuthResponse>(`${apiUrl}/login`, { email, password }).pipe(
          map((res) => {
            persistAuth(res);
            return true;
          }),
          catchError((err) => {
            patchState(store, { error: getHttpErrorMessage(err, 'Accesso fallito') });
            return of(false);
          }),
        );
      },

      register(email: string, password: string, name: string): Observable<boolean> {
        patchState(store, { error: null });
        
        return http.post<AuthResponse>(`${apiUrl}/register`, { email, password, name }).pipe(
          map((res) => {
            persistAuth(res);
            return true;
          }),
          catchError((err) => {
            patchState(store, { error: getHttpErrorMessage(err, 'Registrazione fallita') });
            return of(false);
          }),
        );
      },

      logout(): void {
        patchState(store, { token: null, user: null, error: null });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.navigate(['/login']);
      },

      getToken: () => store.token(),

      updateCurrentUser(user: User): void {
        patchState(store, { user });
        localStorage.setItem('user', JSON.stringify(user));
      },
    };
  }),
);

export default AuthStore;
