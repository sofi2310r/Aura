import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Foro, Comentario } from '../../../services/foro';

@Component({
  selector: 'app-detalle-publicacion',
  standalone: false,
  templateUrl: './detalle-publicacion.html',
  styleUrl: './detalle-publicacion.css',
})
export class DetallePublicacion {
  @Input() publicacion: any;
  @Output() volver = new EventEmitter<void>();

  nuevoComentario = '';
  comentarioAnonimo = false;
  enviando = false;

  constructor(private foro: Foro) { }

  volverLista() { this.volver.emit(); }

  formatFecha(fecha: any): string {
    if (!fecha) return '';
    return new Date(fecha.seconds * 1000).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }
  async responder() {
    if (!this.nuevoComentario.trim()) return;
    this.enviando = true;
    const comentario: Comentario = {
      texto: this.nuevoComentario,
      autor: this.comentarioAnonimo ? 'Anónima' : 'Usuario',
      anonimo: this.comentarioAnonimo,
      fecha: null,
      reportado: false
    };
    await this.foro.agregarComentario(this.publicacion.id, comentario);
    this.nuevoComentario = '';
    this.enviando = false;
  }

  async reportar(index: number) {
    const confirmado = confirm('¿Deseas reportar este comentario?');
    if (!confirmado) return;
    const comentarios = [...this.publicacion.comentarios];
    comentarios[index].reportado = true;
    await this.foro.reportarComentario(this.publicacion.id, comentarios);
    alert('Comentario reportado. Gracias por ayudar a mantener la comunidad segura 💜');
  }
}
