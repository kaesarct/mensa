import { Routes } from '@angular/router';
import { roleGuard } from './core/auth/role.guard';

const STAFF_AND_READONLY = ['admin', 'operatore', 'sola_lettura'] as const;
const STAFF_ONLY = ['admin', 'operatore'] as const;
const ANY_ROLE = ['admin', 'operatore', 'famiglia', 'sola_lettura'] as const;

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    loadComponent: () => import('./core/layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'students' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
        canActivate: [roleGuard([...STAFF_AND_READONLY])],
      },
      {
        path: 'students/new',
        loadComponent: () => import('./features/students/student-detail').then((m) => m.StudentDetail),
        canActivate: [roleGuard([...STAFF_ONLY])],
      },
      {
        path: 'students/:id',
        loadComponent: () => import('./features/students/student-detail').then((m) => m.StudentDetail),
        canActivate: [roleGuard([...ANY_ROLE])],
      },
      {
        path: 'students',
        loadComponent: () => import('./features/students/students-list').then((m) => m.StudentsList),
        canActivate: [roleGuard([...ANY_ROLE])],
      },
      {
        path: 'families/new',
        loadComponent: () => import('./features/families/family-detail').then((m) => m.FamilyDetail),
        canActivate: [roleGuard([...STAFF_ONLY])],
      },
      {
        path: 'families/:id',
        loadComponent: () => import('./features/families/family-detail').then((m) => m.FamilyDetail),
        canActivate: [roleGuard([...STAFF_AND_READONLY])],
      },
      {
        path: 'families',
        loadComponent: () => import('./features/families/family-list').then((m) => m.FamilyList),
        canActivate: [roleGuard([...STAFF_AND_READONLY])],
      },
      {
        path: 'top-ups',
        loadComponent: () => import('./features/top-ups/top-ups-page').then((m) => m.TopUpsPage),
        canActivate: [roleGuard([...STAFF_ONLY])],
      },
      {
        path: 'usages',
        loadComponent: () => import('./features/usages/usages-page').then((m) => m.UsagesPage),
        canActivate: [roleGuard([...STAFF_ONLY])],
      },
      {
        path: 'supplier-order',
        loadComponent: () =>
          import('./features/supplier-order/supplier-order-page').then((m) => m.SupplierOrderPage),
        canActivate: [roleGuard([...STAFF_ONLY])],
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings-page').then((m) => m.SettingsPage),
        canActivate: [roleGuard(['admin'])],
      },
    ],
  },
  { path: '**', redirectTo: 'students' },
];
