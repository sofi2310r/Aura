import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { OnInit } from '@angular/core';
import { User } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-layout',
  standalone: false,
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {

 psicologoUser: User | null = null;

  nombre: string = '';
  apellido: string = '';
  nuevaClave: string = '';

  mensaje: string = '';
  errorMessage: string = '';

  editMode: boolean = false;

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.psicologoUser = user;

      if (user) {
        this.nombre = user.nombre || '';
        this.apellido = user.apellido || '';
      }
    });
  }

  // ✏️ activar lápiz
  activarEdicion() {
    this.editMode = true;
  }

  // 💾 guardar cambios
  guardarCambiosPerfil() {
    try {
      const user = this.authService.getCurrentUser();

      if (!user || !user.uid) {
        this.errorMessage = 'No hay usuario activo';
        return;
      }

      const dataToUpdate = {
        nombre: this.nombre,
        apellido: this.apellido,
      };

      this.userService.updateUser(user.uid, dataToUpdate).subscribe({
        next: () => {
          const updatedUser: User = {
            ...user,
            ...dataToUpdate,
          };

          this.authService.updateCurrentUser(updatedUser);
          this.psicologoUser = updatedUser;
          this.errorMessage = '';
          this.editMode = false;
          this.mensaje = '';

          Swal.fire({
            icon: 'success',
            title: 'Perfil actualizado',
            text: 'Tus datos se guardaron correctamente.',
            confirmButtonColor: '#5b3a7d',
          });
        },
        error: (err) => {
          this.errorMessage = 'Error al guardar cambios';
          Swal.fire({
            icon: 'error',
            title: 'No se pudo actualizar',
            text: err?.message || 'Intenta nuevamente.',
            confirmButtonColor: '#d33',
          });
        }
      });
    } catch (error) {
      this.errorMessage = 'Error al guardar cambios';
      Swal.fire({
        icon: 'error',
        title: 'No se pudo actualizar',
        text: 'Ocurrió un error inesperado.',
        confirmButtonColor: '#d33',
      });
    }
  }

  // 🔐 contraseña
  async actualizarPassword() {
    if (!this.nuevaClave || this.nuevaClave.length < 6) {
      this.errorMessage = 'La contraseña debe tener mínimo 6 caracteres';
      this.mensaje = '';
      return;
    }

    try {
      await this.authService.updatePassword(this.nuevaClave);

      this.mensaje = 'Contraseña actualizada correctamente';
      this.errorMessage = '';
      this.nuevaClave = '';

      setTimeout(() => this.mensaje = '', 3000);

    } catch (error: any) {
      this.errorMessage = error.message || 'Error al actualizar contraseña';
    }
  }
} 