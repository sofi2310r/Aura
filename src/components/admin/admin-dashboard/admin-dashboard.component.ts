import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core'; // <-- 1. IMPORTADO AQUÍ
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription, interval } from 'rxjs';
import { filter, startWith } from 'rxjs/operators';
import { User, UserRole } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { NavbarAdminComponent } from '../../shared/navbar-admin/navbar-admin.component';
import { FooterAdminComponent } from '../../shared/footer-admin/footer-admin.component';
import { ForoService } from '../../../services/foro.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarAdminComponent, FooterAdminComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  readonly users$: Observable<User[]>;
  readonly roles: UserRole[] = ['admin', 'psicologo', 'moderador', 'paciente', 'administrador'];

  adminUser: User | null = null;
  nombre = '';
  apellido = '';
  correo = '';
  rol: UserRole = 'paciente';
  mensaje = '';
  errorMessage = '';
  isAdminHomeRoute = true;

  // Variables para la edición en Configuración
  nuevaClave = '';

  // Estadísticas
  totalUsuarios = 0;
  psicologosActivos = 0;
  moderadores = 0;
  pacientesActivos = 0;
  totalPublicaciones = 0;

  private subscriptions = new Subscription();

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    public readonly router: Router,
    private readonly foroService: ForoService,
    private readonly cdr: ChangeDetectorRef // <-- 2. INYECTADO AQUÍ
  ) {
    this.users$ = this.userService.getUsers();
  }

  ngOnInit(): void {
    this.userService.refresh();

    // Carga de Publicaciones
    this.subscriptions.add(
      this.foroService.getPublicaciones().subscribe(pubs => {
        this.totalPublicaciones = pubs.length;
        this.cdr.detectChanges(); // Forzar actualización visual de estadísticas
      })
    );

    // Carga de Estadísticas de Usuarios
    this.subscriptions.add(
      this.users$.subscribe(users => {
        this.cargarEstadisticas(users);
        this.cdr.detectChanges(); // Forzar actualización visual de estadísticas
      })
    );

    this.cargarAdminActual();

    // Lógica de detección de ruta
    this.subscriptions.add(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd),
        startWith(new NavigationEnd(0, this.router.url, this.router.url))
      ).subscribe((event: any) => {
        this.updateRouteState(event.urlAfterRedirects || event.url);
      })
    );

    // Auto-refresh cada 30 segundos
    this.subscriptions.add(
      interval(30000).subscribe(() => this.userService.refresh())
    );
  }

  private updateRouteState(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    this.isAdminHomeRoute = cleanUrl === '/admin' || cleanUrl === '/admin/';
    this.cdr.detectChanges(); // Forzar actualización visual al cambiar de ruta
  }

  cargarAdminActual(): void {
    const usuarioActual = this.authService.getCurrentUser();
    if (!usuarioActual) {
      this.errorMessage = 'No hay sesión iniciada.';
      this.cdr.detectChanges();
      return;
    }
    this.adminUser = usuarioActual;

    this.subscriptions.add(
      this.userService.getUserById(usuarioActual.uid).subscribe(user => {
        if (user) {
          this.adminUser = user;
          this.nombre = user.nombre;
          this.apellido = user.apellido;
          this.correo = user.correo;
          this.cdr.detectChanges(); // Forzar actualización de los datos del perfil
        }
      })
    );
  }

  // MÉTODO NUEVO: Guardar cambios de perfil (Configuración)
  guardarCambiosPerfil(): void {
    if (!this.adminUser) return;

    const usuarioActualizado: User = {
      ...this.adminUser,
      nombre: this.nombre,
      apellido: this.apellido
    };

    this.subscriptions.add(
      this.userService.updateUser(usuarioActualizado).subscribe({
        next: (user) => {
          this.adminUser = user;
          this.mensaje = '✅ Perfil actualizado correctamente.';
          this.errorMessage = '';
          this.cdr.detectChanges(); // <-- 3. MAGIA AQUÍ

          // Limpiamos el mensaje después de 3 segundos
          setTimeout(() => {
            this.mensaje = '';
            this.cdr.detectChanges(); // Actualizamos la vista de nuevo al ocultar el mensaje
          }, 3000);
        },
        error: (err) => {
          this.errorMessage = 'Error al actualizar: ' + err.message;
          this.mensaje = '';
          this.cdr.detectChanges(); // <-- 4. Y AQUÍ
        }
      })
    );
  }

  // MÉTODO NUEVO: Cambiar contraseña
  actualizarPassword(): void {
  // 1. Validación básica
  if (this.nuevaClave.length < 6) {
    this.errorMessage = 'La clave debe tener al menos 6 caracteres.';
    this.mensaje = '';
    this.cdr.detectChanges();
    return;
  }

  // 2. Llamada real al servicio de autenticación
  // Usamos el método updatePassword de tu AuthService
  this.authService.updatePassword(this.nuevaClave).then(() => {
    // ÉXITO
    this.mensaje = '✅ Contraseña actualizada correctamente en el sistema.';
    this.errorMessage = '';
    this.nuevaClave = ''; // Limpiamos el campo
    this.cdr.detectChanges();

    // Opcional: Cerrar sesión automáticamente para obligar al nuevo login
    /*
    setTimeout(() => {
      this.cerrarSesion();
    }, 2000);
    */
  }).catch((error: any) => {
    // ERROR (ej: sesión expirada o requiere re-autenticación)
    this.errorMessage = 'Error: ' + (error.message || 'No se pudo cambiar la contraseña');
    this.mensaje = '';
    this.cdr.detectChanges();
  });
}

  cargarEstadisticas(users: User[]): void {
    if (!users) return;
    this.totalUsuarios = users.length;
    this.psicologosActivos = users.filter(u => u.rol === 'psicologo' && u.activo).length;
    this.moderadores = users.filter(u => u.rol === 'moderador').length;
    this.pacientesActivos = users.filter(u => u.rol === 'paciente' && u.activo).length;
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}