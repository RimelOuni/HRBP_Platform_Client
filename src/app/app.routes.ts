import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Admin } from './admin/admin';
import { HRBP } from './hrbp/hrbp';
import { Manager } from './manager/manager';
import { Collaborator } from './collab/collab';
import { Direction } from './direction/direction';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },

  { path: 'admin', component: Admin, canActivate: [authGuard], data: { role: 'ADMIN_RH' } },
  { path: 'hrbp', component: HRBP, canActivate: [authGuard], data: { role: 'HRBP' } },
  { path: 'manager', component: Manager, canActivate: [authGuard], data: { role: 'MANAGER' } },
  { path: 'collab', component: Collaborator, canActivate: [authGuard], data: { role: 'COLLABORATOR' } },
  { path: 'direction', component: Direction, canActivate: [authGuard], data: { role: 'DIRECTION_RH' } },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' } // fallback for unknown routes
];
