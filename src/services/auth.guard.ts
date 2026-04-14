import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { map, take } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly router: Router,
  ) { }

  // Cambiamos el retorno a Observable<boolean> porque usamos peticiones asíncronas
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | boolean {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      this.router.navigate(['/404'], {
        queryParams: {
          authError: 'Necesitas iniciar sesión para acceder a esta ruta.',
          redirectToLogin: 'true',
          returnUrl: state.url,
        },
      });
      return false;
    }

    // Toda la validación debe ocurrir dentro del flujo del Observable
    return this.userService.getUserById(currentUser.uid).pipe(
      take(1),
      map((user: any) => {
        // 1. Verificación de cuenta activa
        if (!user || user.activo === false) {
          this.authService.logout();
          this.router.navigate(['/login'], {
            queryParams: {
              authError: user?.fechaDesbloqueo === 'permanente'
                ? 'Tu cuenta ha sido suspendida permanentemente.'
                : `Tu cuenta está suspendida hasta: ${user?.fechaDesbloqueo || 'revisión'}`
            },
          });
          return false;
        }

        // 2. Verificación de roles (Movido aquí adentro)
        const allowedRoles: string[] = route.data['roles'] || [];
        if (allowedRoles.length > 0) {
          const normalizedRole = (user.rol || user.role || '').toLowerCase();
          const hasRole = allowedRoles.map(r => r.toLowerCase()).includes(normalizedRole);

          if (!hasRole) {
            this.router.navigate(['/login'], {
              queryParams: {
                returnUrl: state.url,
                authError: 'No tienes permiso para entrar aquí.'
              },
            });
            return false;
          }
        }

        return true; // Si pasa el bloqueo y tiene el rol, permite el acceso
      })
    );
  }
}