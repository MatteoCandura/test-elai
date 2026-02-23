import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component')
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component')
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component'),
    canActivate: [authGuard],
  },
  {
    path: 'users',
    loadComponent: () => import('./features/users/users.component'),
    canActivate: [authGuard],
  },
  {
    path: 'files/:id',
    loadComponent: () => import('./features/file-detail/file-detail.component'),
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
