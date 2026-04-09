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
    icon: 'https://cdn-icons-png.flaticon.com/512/4320/4320337.png',
    title: 'Bienestar',
    desc: 'Cuida tu salud emocional'
  },
  {
    icon: 'https://cdn-icons-png.flaticon.com/512/3064/3064197.png',
    title: 'Seguridad',
    desc: 'Protegemos tu información'
  },
  {
    icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
    title: 'Crecimiento',
    desc: 'Desarrolla tu mejor versión'
  }
   
  ];
}