import { Component, DestroyRef, inject, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ForoService, Publicacion } from '../../../services/foro.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';
import { NotificacionService } from '../../../services/notificacion.service';
import { UserService } from '../../../services/user.service';


@Component({
  selector: 'app-foro',
  standalone: false,
  templateUrl: './foro.component.html',
  styleUrl: './foro.component.css',
})

export class ForoComponent {
  private readonly destroyRef = inject(DestroyRef);
  publicaciones: Publicacion[] = [];
  vistaDetalle: Publicacion | null = null;
  mostrarFormulario = false;
  titulo = '';
  contenido = '';
  publicando = false;
  nuevoComentario = '';
  nuevaRespuesta: { [key: number]: string } = {};
  enviando = false;
  mensaje = '';

  constructor(
    private readonly foroService: ForoService,
    private readonly cdr: ChangeDetectorRef,
    private readonly authService: AuthService,
    private notificacionService: NotificacionService,
    private userService: UserService
  ) {
    this.foroService
      .getPublicaciones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((publicaciones) => {
        this.publicaciones = publicaciones;

        if (this.vistaDetalle) {
          const actualizada = publicaciones.find((pub) => pub.id === this.vistaDetalle?.id);
          if (actualizada) {
            this.vistaDetalle = actualizada;
            this.cdr.markForCheck();
          }
        }
      });
  }
  getNombre(): string {
    return this.authService.getCurrentUser()?.nombre || 'Usuario';
  }

  getRol(): string {
    return this.authService.getCurrentUser()?.rol?.toLowerCase() || '';
  }

  tienePermisosModerador(): boolean {
    const user = this.authService.getCurrentUser();
    const rolesAutorizados = ['admin', 'administrador', 'moderador', 'psicologo'];

    return rolesAutorizados.includes(user?.rol?.toLowerCase() || '');
  }

  puedeCrearPublicacion(): boolean {
    const rolesCreadores = ['admin', 'administrador', 'psicologo'];
    return rolesCreadores.includes(this.getRol());
  }

  eliminarPublicacion(event: Event, pub: Publicacion): void {
    event.stopPropagation();

    if (!this.tienePermisosModerador()) return;

    Swal.fire({
      title: '¿Eliminar publicación?',
      text: `¿Estás seguro de eliminar "${pub.titulo}"? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#718096',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.foroService.eliminarPublicacion(pub.id).subscribe({
          next: () => {
            this.mensaje = 'Publicación eliminada correctamente.';
            this.cdr.detectChanges();

            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              timer: 1000,
              showConfirmButton: false
            });
          },
          error: (error: Error) => {
            this.mensaje = error.message;
          },
        });
      }
    });
  }

  async editarPublicacion(event: Event, pub: Publicacion): Promise<void> {
    event.stopPropagation();

    // Verificación de rol: Solo Admin o Psicólogo
    if (!['admin', 'administrador', 'psicologo'].includes(this.getRol())) {
      Swal.fire('Acceso denegado', 'No tienes permisos para editar.', 'error');
      return;
    }

    const { value: formValues } = await Swal.fire({
      title: 'Editar Publicación',
      html:
        `<input id="sw-titulo" class="swal2-input" value="${pub.titulo}" placeholder="Título">` +
        `<textarea id="sw-contenido" class="swal2-textarea" style="height:150px" placeholder="Contenido">${pub.contenido}</textarea>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar cambios',
      preConfirm: () => {
        const t = (document.getElementById('sw-titulo') as HTMLInputElement).value;
        const c = (document.getElementById('sw-contenido') as HTMLTextAreaElement).value;
        if (!t || !c) return Swal.showValidationMessage('Ambos campos son obligatorios');
        return [t, c];
      }
    });

    if (formValues) {
      this.foroService.actualizarPublicacion(pub.id, {
        titulo: formValues[0],
        contenido: formValues[1]
      }).subscribe({
        next: (pubActualizada) => {
          // Si estamos en la vista de detalle, actualizamos la referencia local
          if (this.vistaDetalle?.id === pubActualizada.id) {
            this.vistaDetalle = pubActualizada;
          }
          this.cdr.detectChanges();
          Swal.fire('¡Éxito!', 'Publicación actualizada correctamente.', 'success');
        },
        error: (error: any) => Swal.fire('Error', error.message, 'error')
      });
    }
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
  }

  publicar(): void {
    // RESTRICCIÓN: Solo Admin/Psicólogo pueden crear el foro. Usuario y Moderador NO.
    if (!this.puedeCrearPublicacion()) {
      Swal.fire('Acceso Restringido', 'No tienes permisos para crear nuevas publicaciones.', 'error');
      return;
    }

    if (!this.titulo.trim() || !this.contenido.trim()) return;

    this.publicando = true;
    this.foroService
      .crearPublicacion({
        titulo: this.titulo,
        contenido: this.contenido,
      })
      .subscribe({
        next: () => {
          this.titulo = '';
          this.contenido = '';
          this.mostrarFormulario = false;
          this.publicando = false;
          this.cdr.detectChanges();
        },
        error: (error: Error) => {
          this.publicando = false;
          this.mensaje = error.message;
        },
      });
  }

  abrirDetalle(pub: Publicacion): void {
    this.vistaDetalle = pub;
  }

  volverLista(): void {
    this.vistaDetalle = null;
    this.nuevoComentario = '';
  }

  responder(): void {
    // RESTRICCIÓN: Los moderadores NO comentan, solo moderan.
    if (this.getRol() === 'moderador') {
      Swal.fire('Modo Moderación', 'Los moderadores no pueden participar en las discusiones.', 'info');
      return;
    }

    if (!this.vistaDetalle || !this.nuevoComentario.trim()) return;

    this.enviando = true;
    const textoParaEnviar = this.nuevoComentario;
    this.nuevoComentario = '';

    this.foroService
      .agregarComentario(this.vistaDetalle.id, {
        texto: textoParaEnviar,
        autor: this.getNombre(),
        rol: this.getRol(),
        fecha: new Date(),
        reportado: false
      })
      .subscribe({
        next: (publicacionActualizada) => {
          this.vistaDetalle = publicacionActualizada;
          this.enviando = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.enviando = false;
          this.nuevoComentario = textoParaEnviar;
          Swal.fire('Error', 'No se pudo enviar el comentario', 'error');
        },
      });
  }

  reportar(index: number): void {
    if (!this.vistaDetalle) return;

    const comentario = this.vistaDetalle.comentarios[index];
    const nombreAutor = comentario.autor;

    Swal.fire({
      title: '¿Reportar comentario?',
      text: "Se notificará al equipo de moderación.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Reportar',
      confirmButtonColor: '#e74c3c'
    }).then((result) => {
      if (result.isConfirmed) {
        // 1. Marca el comentario en la base de datos del foro
        this.foroService.reportarComentario(this.vistaDetalle!.id, index).subscribe({
          next: (publicacion) => {
            this.vistaDetalle = publicacion;
            this.cdr.detectChanges();
            Swal.fire({ icon: 'success', title: 'Reportado', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
          }
        });

        // 2. Suma el reporte al perfil del usuario en la tabla de gestión
        if (nombreAutor) {
          this.userService.sumarReportePorNombre(nombreAutor).subscribe({
            next: (user) => console.log(`Contador actualizado para ${user.nombre}`),
            error: (err) => console.warn('No se pudo actualizar contador de usuario:', err.message)
          });
        }
      }
    });
  }

  responderComentario(index: number): void {
    // RESTRICCIÓN: Los moderadores NO responden comentarios.
    if (this.getRol() === 'moderador') return;

    if (!this.vistaDetalle || !this.nuevaRespuesta[index]?.trim()) return;

    this.enviando = true;
    const textoRespuesta = this.nuevaRespuesta[index];
    this.nuevaRespuesta[index] = '';

    this.foroService
      .agregarRespuesta(this.vistaDetalle.id, index, {
        texto: textoRespuesta,
        autor: this.getNombre(),
      })
      .subscribe({
        next: (publicacionActualizada) => {
          this.vistaDetalle = publicacionActualizada;
          this.enviando = false;
          this.cdr.detectChanges();
        },
        error: (error: Error) => {
          this.enviando = false;
          this.nuevaRespuesta[index] = textoRespuesta;
          this.mensaje = error.message;
        },
      });
  }

  formatFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
}