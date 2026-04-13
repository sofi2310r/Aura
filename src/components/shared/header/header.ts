import { Component , EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  
  textoBusqueda: string = '';

  @Output() buscar = new EventEmitter<string>();
}
