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

  // ✏️ Controla si los campos están bloqueados o en edición
  editando: boolean = false;

  // 🔄 Respaldos para restaurar valores originales al cancelar de forma segura
  backupNombre: string = '';
  backupApellido: string = '';

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

  // ⚡ Activa la edición y guarda el respaldo
  habilitarEdicion(): void {
    this.editando = true;
    this.backupNombre = this.nombre;
    this.backupApellido = this.apellido;
  }

  // ❌ Cancela la edición de forma segura restaurando los datos originales y limpiando errores
  cancelarEdicion(perfilForm: any, event: Event): void {
    event.preventDefault(); // Evita cualquier comportamiento extraño del formulario
    event.stopPropagation();

    this.editando = false;
    this.nombre = this.backupNombre;
    this.apellido = this.backupApellido;

    // Resetea el estado visual de Angular (quita los bordes rojos)
    if (perfilForm) {
      perfilForm.resetForm({
        nombre: this.nombre,
        apellido: this.apellido
      });
    }
  }

  // 💾 Guardar cambios de perfil
  guardarCambiosPerfil(): void {
    if (!this.psicologoUser) return;

    // Apagamos la edición al instante para limpiar los botones
    this.editando = false; 

    const usuarioActualizado: User = {
      ...this.psicologoUser,
      nombre: this.nombre.trim(),
      apellido: this.apellido.trim()
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
        // Si falla, reabrimos la edición para corregir
        this.editando = true; 
        this.errorMessage = 'Error al actualizar: ' + (err?.message || 'Intenta nuevamente');

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