import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      this.router.navigate(['/404'], {
        queryParams: {
          authError: 'Necesitas iniciar sesión para acceder a esta ruta. Serás redirigido a login en breve.',
          redirectToLogin: 'true',
          returnUrl: state.url,
        },
      });
      return false;
    }

    const allowedRoles: string[] = route.data['roles'] || [];
    if (allowedRoles.length > 0) {
      const normalizedRole = (currentUser.rol || currentUser.role || '').toLowerCase();
      if (!allowedRoles.map((r) => r.toLowerCase()).includes(normalizedRole)) {
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: state.url, authError: 'No tienes permiso para entrar aquí.' },
        });
        return false;
      }
    }

    return true;
  }
}
