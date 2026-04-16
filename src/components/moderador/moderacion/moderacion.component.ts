import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ForoService, Publicacion } from '../../../services/foro.service';

@Component({
  selector: 'app-moderacion',
  standalone: false,
  templateUrl: './moderacion.component.html',
  styleUrl: './moderacion.component.css',
})
export class ModeracionComponent {
  private readonly destroyRef = inject(DestroyRef);

  publicaciones: Publicacion[] = [];

  vistaDetalle: Publicacion | null = null;
  mostrarFormulario = false;

  titulo = '';
  contenido = '';
  publicando = false;

  nuevoComentario = '';
  enviando = false;

  mensaje = '';

  constructor(private readonly foroService: ForoService) {
    this.foroService
      .getPublicaciones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((publicaciones) => {
        this.publicaciones = publicaciones;

        if (this.vistaDetalle) {
          this.vistaDetalle = publicaciones.find((pub) => pub.id === this.vistaDetalle?.id) ?? null;
        }
      });
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
  }

  publicar(): void {
    if (!this.titulo.trim() || !this.contenido.trim()) {
      this.mensaje = 'Escribe un titulo y un contenido antes de publicar.';
      return;
    }

    this.publicando = true;
    this.mensaje = '';

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
          this.mensaje = 'Publicacion guardada en Firebase.';
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
    if (!this.vistaDetalle || !this.nuevoComentario.trim()) {
      this.mensaje = 'Escribe un comentario antes de enviarlo.';
      return;
    }

    this.enviando = true;
    this.mensaje = '';

    this.foroService
      .agregarComentario(this.vistaDetalle.id, {
        texto: this.nuevoComentario,
        autor: 'Moderador',
        autorUid: '', // Moderador no tiene uid, pero se requiere el campo
        rol: 'moderador',
        fecha: new Date(),
        reportado: false
      })
      .subscribe({
        next: (publicacion) => {
          this.vistaDetalle = publicacion;
          this.nuevoComentario = '';
          this.enviando = false;
          this.mensaje = 'Comentario enviado al backend.';
        },
        error: (error: Error) => {
          this.enviando = false;
          this.mensaje = error.message;
        },
      });
  }

  reportar(index: number): void {
    if (!this.vistaDetalle) {
      return;
    }

    this.mensaje = '';

    this.foroService.reportarComentario(this.vistaDetalle.id, index).subscribe({
      next: (publicacion) => {
        this.vistaDetalle = publicacion;
        this.mensaje = 'Comentario marcado para moderacion.';
      },
      error: (error: Error) => {
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