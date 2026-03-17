import { Component } from '@angular/core';

@Component({
  selector: 'app-home-page',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  readonly features = [
    {
      icon: '📚',
      title: 'Recursos',
      desc: 'Accede a articulos, guias y contenido relevante para tu bienestar.',
    },
    {
      icon: '👥',
      title: 'Comunidad',
      desc: 'Participa en foros y chats para conectar y compartir experiencias.',
    },
    {
      icon: '🎧',
      title: 'Asesoria',
      desc: 'Habla con profesionales y recibe orientacion personalizada.',
    },
    {
      icon: '🛡️',
      title: 'Herramientas',
      desc: 'Utiliza herramientas como recordatorios y reportes de emergencias.',
    },
  ];
}