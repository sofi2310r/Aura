import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { OnInit } from '@angular/core';
import { User } from '../../../models/user.model';


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

      if (!user) {
        this.errorMessage = 'No hay usuario activo';
        return;
      }

      user.nombre = this.nombre;
      user.apellido = this.apellido;

      (this.authService as any).persistUser(user);

      this.mensaje = 'Cambios guardados correctamente';
      this.errorMessage = '';
      this.editMode = false;

      setTimeout(() => this.mensaje = '', 3000);

    } catch (error) {
      this.errorMessage = 'Error al guardar cambios';
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