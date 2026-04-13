import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, Subscription, interval, first } from 'rxjs';
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

  // Estadísticas
  totalUsuarios = 0;
  psicologosActivos = 0;
  moderadores = 0;
  pacientesActivos = 0;
  totalPublicaciones = 0;

  private refreshSubscription?: Subscription;

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly foroService: ForoService,
  ) {
    this.users$ = this.userService.getUsers();
  }

  ngOnInit(): void {
    // Forzar carga de datos frescos del servidor
    // y esperar a que se carguen antes de calcular estadísticas
    this.userService.refresh();
    this.foroService.getPublicaciones().subscribe((pubs) => {
      this.totalPublicaciones = pubs.length;
    });
    
    // Esperar a que los datos se carguen en el BehaviorSubject
    this.users$.pipe(first()).subscribe(() => {
      this.cargarEstadisticas();
    });
    
    this.cargarAdminActual();

    // Auto-refresh every 30 seconds
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.userService.refresh();
    });
  }

  cargarAdminActual(): void {
    const usuarioActual = this.authService.getCurrentUser();
    if (!usuarioActual) {
      this.errorMessage = 'No hay sesión iniciada. Regresa a login y autentícate.';
      return;
    }

    // Usar directamente el usuario autenticado
    this.adminUser = usuarioActual;

    // Luego sincronizar con la base de datos para obtener datos más frescos
    this.userService.getUserById(usuarioActual.uid).subscribe({
      next: (user: User | undefined) => {
        if (user) {
          this.adminUser = user;
        }
      },
      error: (error: any) => {
        // Si falla la búsqueda en BD, continuamos con el del authService
        console.warn('No se pudo sincronizar usuario del servidor:', error?.message);
      },
    });
  }

  cargarEstadisticas(): void {
    this.users$.subscribe({
      next: (users: User[]) => {
        this.totalUsuarios = users.length;
        this.psicologosActivos = users.filter(u => u.rol === 'psicologo' && u.activo).length;
        this.moderadores = users.filter(u => u.rol === 'moderador').length;
        this.pacientesActivos = users.filter(u => u.rol === 'paciente' && u.activo).length;
      },
      error: (error: any) => {
        this.errorMessage = 'Error al cargar estadísticas: ' + (error?.message || 'Error desconocido');
      },
    });
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  refreshData(): void {
    this.userService.refresh();
  }

  crearUsuario(): void {
    if (!this.nombre.trim() || !this.apellido.trim() || !this.correo.trim()) {
      this.mensaje = 'Completa nombre, apellido y correo para crear el usuario.';
      return;
    }

    // Generar un UID simple para el nuevo usuario
    const uid = `user_${Date.now()}`;

    this.userService
      .addUser({
        uid: uid,
        nombre: this.nombre,
        apellido: this.apellido,
        correo: this.correo,
        rol: this.rol,
        activo: true,
      })
      .subscribe({
        next: () => {
          this.mensaje = '✅ Usuario guardado exitosamente.';
          this.nombre = '';
          this.apellido = '';
          this.correo = '';
          this.rol = 'paciente';
          // No need to refresh, addUser already updates the subject
        },
        error: (error: Error) => {
          this.mensaje = `❌ ${error.message}`;
        },
      });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }
}