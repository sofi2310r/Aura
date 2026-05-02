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
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const currentUser = this.authService.getCurrentUser();
    const authToken = this.authService.getAuthToken();
    
    // Normalizamos la URL actual para compararla
    const url = state.url.toLowerCase();

    // 1. CASO: NO HAY SESIÓN (Token o Usuario inexistente)
    if (!currentUser || !authToken) {
      
      // Lista de rutas que deben disparar el 404 si no hay sesión
      const staffRoutes = ['psicologo', 'moderador', 'admin'];
      
      // Verificamos si la URL actual coincide con alguna ruta de staff
      const isStaffRoute = staffRoutes.some(path => url.includes(path));

      if (isStaffRoute) {
        console.log('🛑 Acceso no autorizado a ruta privada. Mostrando 404.');
        
        // Redirigimos al 404. 
        // skipLocationChange: true mantiene la URL original en la barra pero muestra el componente 404
        this.router.navigate(['/404'], { skipLocationChange: true });
        return false;
      }

      // Si es una ruta general (como login o home público), mandamos al login
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: state.url },
        replaceUrl: true 
      });
      return false;
    }

    // 2. CASO: HAY SESIÓN PERO EL ROL NO COINCIDE
    const allowedRoles: string[] = route.data['roles'] || [];
    
    if (allowedRoles.length > 0) {
      // Usamos el helper de rol que ya tienes en el modelo del usuario
      const userRole = (currentUser.role || currentUser.rol || '').toLowerCase();
      const hasPermission = allowedRoles.map(r => r.toLowerCase()).includes(userRole);

      if (!hasPermission) {
        console.warn('⚠️ Intento de acceso con rol insuficiente:', userRole);
        this.router.navigate(['/404'], { skipLocationChange: true });
        return false;
      }
    }

    // Si pasa todas las validaciones, se permite el acceso
    return true;
  }
}