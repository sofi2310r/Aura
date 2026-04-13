import { Component } from '@angular/core';
import { Foro } from '../../../services/foro';

@Component({
  selector: 'app-nueva-publicacion',
  standalone: false,
  templateUrl: './nueva-publicacion.html',
  styleUrl: './nueva-publicacion.css',
})
export class NuevaPublicacion {
  mostrarFormulaario = false;
  titulo = '';
  contenido = '';
  anonima = false;
  publicando = false;
  
  constructor(private foro: Foro) {}

   toggleFormulario() { 
    this.mostrarFormulaario = !this.mostrarFormulaario; 
  }

  async publicar() {
    if (!this.titulo.trim() || !this.contenido.trim()) return;
    this.publicando = true;
    await this.foro.agregarPublicacion({
      titulo: this.titulo,
      contenido: this.contenido,
      anonima: this.anonima,
      autor: this.anonima ? 'Anónima' : 'Usuario',
      fecha: null,
      comentarios: []
    });
    this.titulo = '';
    this.contenido = '';
    this.anonima = false;
    this.mostrarFormulaario = false;
    this.publicando = false;
  }
}
