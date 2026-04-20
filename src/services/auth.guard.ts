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
    const authToken = this.authService.getAuthToken();

    // Verificación rápida: si no hay usuario O no hay token, denegar acceso inmediatamente
    if (!currentUser || !authToken) {
      this.router.navigate(['/login'], {
        queryParams: {
          authError: 'Necesitas iniciar sesión para acceder a esta ruta.',
          redirectToLogin: 'true',
          returnUrl: state.url,
        },
        replaceUrl: true, // Reemplaza el historial para evitar volver atrás
      });
      return false;
    }

    // Si ya está logueado, permitir navegación sin verificar el servidor
    // (La sesión ya fue validada en el login)
    const allowedRoles: string[] = route.data['roles'] || [];
    
    if (allowedRoles.length > 0) {
      const normalizedRole = (currentUser.role || currentUser.rol || '').toLowerCase();
      const hasRole = allowedRoles.map(r => r.toLowerCase()).includes(normalizedRole);

      if (!hasRole) {
        this.router.navigate(['/login'], {
          queryParams: {
            returnUrl: state.url,
            authError: 'No tienes permiso para entrar aquí.'
          },
          replaceUrl: true,
        });
        return false;
      }
    }

    return true;
  }
}