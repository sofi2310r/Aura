
import { Component } from '@angular/core';

@Component({
  selector: 'app-features',
  standalone: false,

  templateUrl: './features.html',
  styleUrl: './features.css',
})
export class Features {
  features = [
    { icon: '📚', title: 'Recursos', desc: 'Accede a artículos, guías y contenido relevante para tu bienestar' },
    { icon: '👥', title: 'Comunidad', desc: 'Participa en foros y chats para conectar y compartir experiencias' },
    { icon: '🎧', title: 'Asesoría', desc: 'Habla con profesionales y recibe orientación personalizada' },
    { icon: '🛡️', title: 'Herramientas', desc: 'Utiliza herramientas como recordatorios y reportes de emergencias' },
  ];
}
