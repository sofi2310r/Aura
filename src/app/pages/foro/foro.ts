import { Component } from '@angular/core';

@Component({
  selector: 'app-foro',
  standalone: false,
  templateUrl: './foro.html',
  styleUrl: './foro.css',
})
export class Foro {
  vistaDetalle: any = null;

  verDetalle(pub: any) { this.vistaDetalle = pub; }
  volverLista() { this.vistaDetalle = null; }
}
