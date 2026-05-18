import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { User } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-layout',
  standalone: false,
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {

  psicologoUser: User | null = null;

  nombre: string = '';
  apellido: string = '';
  nuevaClave: string = '';

  mensaje: string = '';
  errorMessage: string = '';

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

  // 💾 guardar cambios
  guardarCambiosPerfil(): void {

    if (!this.psicologoUser) return;

    const usuarioActualizado: User = {
      ...this.psicologoUser,
      nombre: this.nombre,
      apellido: this.apellido
    };

    this.userService.updateUser(usuarioActualizado).subscribe({

      next: (user) => {

        this.psicologoUser = user;

        this.nombre = user.nombre || '';
        this.apellido = user.apellido || '';

        this.errorMessage = '';
        this.mensaje = '';

        this.authService.updateCurrentUser(user);

        Swal.fire({
          icon: 'success',
          title: 'Perfil actualizado',
          text: 'Tus datos se guardaron correctamente.',
          confirmButtonColor: '#5b3a7d',
        });

      },

      error: (err) => {

        this.errorMessage =
          'Error al actualizar: ' +
          (err?.message || 'Intenta nuevamente');

        this.mensaje = '';

        Swal.fire({
          icon: 'error',
          title: 'No se pudo actualizar',
          text: this.errorMessage,
          confirmButtonColor: '#d33',
        });

      }

    });

  }

}