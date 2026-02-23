import { HttpErrorResponse } from '@angular/common/http';

/**
 * Estrapola un messaggio di errore chiaro partendo da una risposta http o errore JS generico.
 * Implementa una casistica sicura prevedendo un messaggio di fallback.
 *
 * @param err - L'oggetto di errore incognito in cattura (catchError pass-through).
 * @param fallback - Il messaggio di fallback da restituire se non decifrato o assente in `err`.
 * @returns string - Messaggio processato o fallback.
 */
export default function getHttpErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    return err.error?.message || fallback;
  }
  return fallback;
}
