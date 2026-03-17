import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { User, UserRole } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { NavbarAdminComponent } from '../../shared/navbar-admin/navbar-admin.component';
import { FooterAdminComponent } from '../../shared/footer-admin/footer-admin.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarAdminComponent, FooterAdminComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  readonly users$: Observable<User[]>;
  readonly roles: UserRole[] = ['admin', 'psicologo', 'moderador', 'paciente', 'administrador'];

  adminUser: User | null = null;
  nombre = '';
  apellido = '';
  correo = '';
  rol: UserRole = 'paciente';
  mensaje = '';

  // Estadísticas
  totalUsuarios = 0;
  psicologosActivos = 0;
  moderadores = 0;
  pacientesActivos = 0;

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.users$ = this.userService.getUsers();
  }

  ngOnInit(): void {
    this.cargarAdminActual();
    this.cargarEstadisticas();
  }

  cargarAdminActual(): void {
    const usuarioActual = this.authService.getCurrentUser();
    if (usuarioActual) {
      this.userService.getUserById(usuarioActual.uid).subscribe({
        next: (user: User | undefined) => {
          if (user) {
            this.adminUser = user;
          }
        },
        error: () => {
          console.log('No se pudo cargar el usuario admin actual');
        },
      });
    }
  }

  cargarEstadisticas(): void {
    this.users$.subscribe({
      next: (users: User[]) => {
        this.totalUsuarios = users.length;
        this.psicologosActivos = users.filter(u => u.rol === 'psicologo' && u.activo).length;
        this.moderadores = users.filter(u => u.rol === 'moderador').length;
        this.pacientesActivos = users.filter(u => u.rol === 'paciente' && u.activo).length;
      },
      error: () => {
        console.log('Error al cargar estadísticas');
      },
    });
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
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
        },
        error: (error: Error) => {
          this.mensaje = `❌ ${error.message}`;
        },
      });
  }

  eliminarUsuario(id: string): void {
    this.userService.removeUser(id).subscribe({
      next: () => {
        this.mensaje = 'Usuario eliminado del backend.';
      },
      error: (error: Error) => {
        this.mensaje = error.message;
      },
    });
  }
}