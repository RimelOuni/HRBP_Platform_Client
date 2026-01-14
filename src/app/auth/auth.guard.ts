import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const roleAllowed = route.data['role'] as string;

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (roleAllowed && auth.getRole() !== roleAllowed) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
