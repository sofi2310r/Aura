import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
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

      cambiarAprobacion(usuario: User, aprobado: boolean): void {
        if (!this.esAdmin()) return;
        const usuarioActualizado = { ...usuario, activo: aprobado };
        this.userService.updateUser(usuarioActualizado).subscribe({
          next: () => {
            usuario.activo = aprobado;
            this.cdr.detectChanges();
            Swal.fire({
              icon: 'success',
              title: aprobado ? 'Usuario aprobado' : 'Usuario desactivado',
              text: aprobado ? 'La cuenta ha sido activada.' : 'La cuenta ha sido desactivada.',
              timer: 1200,
              showConfirmButton: false
            });
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo actualizar el estado de aprobación',
            });
          }
        });
      }
    mostrarModalHistorial = false;
    usuarioHistorial: User | null = null;
    abrirModalHistorial(usuario: User): void {
      this.usuarioHistorial = usuario;
      this.mostrarModalHistorial = true;
    }

    cerrarModalHistorial(): void {
      this.mostrarModalHistorial = false;
      this.usuarioHistorial = null;
    }
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
  reporte = 0;

  mensaje = '';

  constructor(
    private userService: UserService,
    private authService: AuthService,
    public _router: Router,
    public _location: Location,
    private cdr: ChangeDetectorRef
  ) { 
  }
  refresh(): void {
    this.userService.refresh();
    this.cargarUsuarios();
  }

  ngOnInit(): void {
    this.verificarAutenticacion();
    this.cargarUsuarios();
    // Forzar carga de datos frescos del servidor
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
    this.rol = (usuario.rol ?? (usuario.role as UserRole) ?? 'paciente');
    this.activo = usuario.activo || true;
    this.fechaNacimiento = usuario.fechaNacimiento || '';
    this.edad = usuario.edad || 0;
    this.telefono = usuario.telefono || '';
    this.reporte = usuario.reporte || 0;
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
    this.reporte = 0;
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
      role:this.rol,
      activo: this.activo,
      fechaNacimiento: this.fechaNacimiento,
      edad: this.calcularEdad(this.fechaNacimiento),
      telefono: this.telefono,
      reporte: this.reporte,
    };

    this.userService.updateUser(usuarioActualizado).subscribe({
      next: () => {
        const index = this.usuarios.findIndex(u => u.id === usuarioActualizado.id);
        if (index !== -1){
          this.usuarios[index] = usuarioActualizado;
        }
        this.filtrar();
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Usuario actualizado exitosamente',
          confirmButtonColor: '#2fa98f',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          this.cerrarModal();
          this.cdr.detectChanges();
          this.cargarUsuarios();
        });
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


  
  eliminarUsuario(usuario: User | null): void {
    if (!usuario) return;
    if (!this.esAdmin()) return;
    Swal.fire({
      title: '¿Eliminar usuario?',
      text: `¿Estás seguro de que deseas eliminar a ${usuario.nombre} ${usuario.apellido}? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#718096',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then(async (result) => {
      if (result.isConfirmed) {
        // Cerrar el modal de edición si está abierto
        this.cerrarModal();
        // Eliminar usuario de autenticación
        if (usuario.uid) {
          await this.authService.deleteAuthUserByUid(usuario.uid);
        }
        this.userService.removeUser(usuario.id).subscribe({
          next: () => {
            this.usuarios = this.usuarios.filter(u => u.id !== usuario.id);
            this.filtrar();
            this.cdr.detectChanges();
            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: 'Usuario eliminado correctamente',
              confirmButtonColor: '#2fa98f',
              timer: 1000,
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
