import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Foro, Publicacion } from '../../../services/foro';

@Component({
  selector: 'app-lista-publicaciones',
  standalone: false,
  templateUrl: './lista-publicaciones.html',
  styleUrl: './lista-publicaciones.css',
})
export class ListaPublicaciones implements OnInit {
  @Output() verPublicacion = new EventEmitter<Publicacion>();
  publicaciones: Publicacion[] = [];

  constructor(private foro: Foro) { }

  ngOnInit() {
    this.foro.getPublicaciones().subscribe(data => {
      this.publicaciones = data.map(pub => ({
        ...pub,
        comentarios: pub.comentarios || []  // ← esto evita el undefined
      })).sort((a, b) => b.fecha?.seconds - a.fecha?.seconds);
    });
  }
  abrir(pub: Publicacion) { this.verPublicacion.emit(pub); }

  formatFecha(fecha: any): string {
    if (!fecha) return '';
    return new Date(fecha.seconds * 1000).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }
}
