import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { User, UserRole } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { NavbarAdminComponent } from '../../shared/navbar-admin/navbar-admin.component';
import { FooterAdminComponent } from '../../shared/footer-admin/footer-admin.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarAdminComponent, FooterAdminComponent],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css',
})
export class UsuariosComponent implements OnInit {
  usuarios: User[] = [];
  usuariosFiltrados: User[] = [];
  usuarioAutenticado: User | null = null;
  
  busqueda = '';
  rolFiltro: UserRole | '' = '';
  
  roles: UserRole[] = ['admin', 'administrador', 'psicologo', 'moderador', 'paciente'];
  
  mostrarModal = false;
  usuarioEditar: User | null = null;
  
  nombre = '';
  apellido = '';
  correo = '';
  rol: UserRole = 'paciente';
  activo = true;
  fechaNacimiento = '';
  edad = 0;
  telefono = '';
  reporte = '';
  
  mensaje = '';

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.verificarAutenticacion();
    this.cargarUsuarios();
  }

  verificarAutenticacion(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.usuarioAutenticado = user;
    } else {
      this.mensaje = '❌ No autenticado. Por favor inicia sesión.';
    }
  }

  esAdmin(): boolean {
    return this.usuarioAutenticado?.rol === 'administrador' || this.usuarioAutenticado?.rol === 'admin';
  }

  cargarUsuarios(): void {
    this.userService.getUsers().subscribe({
      next: (users: User[]) => {
        this.usuarios = users;
        this.filtrar();
      },
      error: () => {
        this.mensaje = '❌ Error al cargar usuarios';
      },
    });
  }

  filtrar(): void {
    this.usuariosFiltrados = this.usuarios.filter((usuario) => {
      const coincideBusqueda =
        usuario.nombre.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        usuario.apellido.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        usuario.correo.toLowerCase().includes(this.busqueda.toLowerCase());

      const coincideRol = this.rolFiltro === '' || usuario.rol === this.rolFiltro;

      return coincideBusqueda && coincideRol;
    });
  }

  abrirModalEditar(usuario: User): void {
    if (!this.esAdmin()) {
      Swal.fire({
        icon: 'error',
        title: 'Acceso Denegado',
        text: 'No tienes permiso para editar usuarios. Se requiere rol de administrador.',
        confirmButtonColor: '#5b3a7d',
      });
      return;
    }
    
    this.usuarioEditar = usuario;
    this.nombre = usuario.nombre;
    this.apellido = usuario.apellido;
    this.correo = usuario.correo;
    this.rol = usuario.rol;
    this.activo = usuario.activo || true;
    this.fechaNacimiento = usuario.fechaNacimiento || '';
    this.edad = usuario.edad || 0;
    this.telefono = usuario.telefono || '';
    this.reporte = usuario.reporte || '';
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.usuarioEditar = null;
    this.nombre = '';
    this.apellido = '';
    this.correo = '';
    this.rol = 'paciente';
    this.activo = true;
    this.fechaNacimiento = '';
    this.edad = 0;
    this.telefono = '';
    this.reporte = '';
  }

  guardarCambios(): void {
    if (!this.usuarioEditar) return;

    if (!this.esAdmin()) {
      Swal.fire({
        icon: 'error',
        title: 'Acceso Denegado',
        text: 'No tienes permiso para actualizar usuarios.',
        confirmButtonColor: '#5b3a7d',
      });
      return;
    }

    if (!this.nombre.trim() || !this.apellido.trim() || !this.correo.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos Incompletos',
        text: 'Completa todos los campos obligatorios',
        confirmButtonColor: '#5b3a7d',
      });
      return;
    }

    const usuarioActualizado: User = {
      ...this.usuarioEditar,
      nombre: this.nombre,
      apellido: this.apellido,
      correo: this.correo,
      rol: this.rol,
      activo: this.activo,
      fechaNacimiento: this.fechaNacimiento,
      edad: this.calcularEdad(this.fechaNacimiento),
      telefono: this.telefono,
      reporte: this.reporte,
    };

    this.userService.updateUser(usuarioActualizado).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Usuario actualizado exitosamente',
          confirmButtonColor: '#2fa98f',
          timer: 1500,
        });
        this.cerrarModal();
        this.cargarUsuarios();
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Ocurrió un error al actualizar el usuario',
          confirmButtonColor: '#5b3a7d',
        });
      },
    });
  }

  calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }

  actualizarEdad(): void {
    this.edad = this.calcularEdad(this.fechaNacimiento);
  }

  eliminarUsuario(usuario: User): void {
    if (!this.esAdmin()) {
      Swal.fire({
        icon: 'error',
        title: 'Acceso Denegado',
        text: 'No tienes permiso para eliminar usuarios.',
        confirmButtonColor: '#5b3a7d',
      });
      return;
    }

    Swal.fire({
      title: '¿Eliminar usuario?',
      text: `¿Estás seguro de que deseas eliminar a ${usuario.nombre} ${usuario.apellido}? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#718096',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.userService.removeUser(usuario.uid).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: 'Usuario eliminado correctamente',
              confirmButtonColor: '#2fa98f',
              timer: 1500,
            });
            this.cargarUsuarios();
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Ocurrió un error al eliminar el usuario',
              confirmButtonColor: '#5b3a7d',
            });
          },
        });
      }
    });
  }
}
