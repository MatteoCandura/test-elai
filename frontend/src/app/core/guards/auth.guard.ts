import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import AuthStore from '../store/auth.store';

export const authGuard: CanActivateFn = (_, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isLoggedIn()) {
    return true;
  }

  // Se non loggato, rimando al login salvando la rotta di provenienza
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
