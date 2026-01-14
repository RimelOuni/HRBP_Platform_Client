import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.getUser();

  if (!auth.isLoggedIn() || !user) {
    router.navigate(['/login']);
    return false;
  }

  const roleAllowed = route.data?.['role'];

  if (roleAllowed && user.role !== roleAllowed) {
    router.navigate(['/login']); // later → /403
    return false;
  }

  return true;
};
