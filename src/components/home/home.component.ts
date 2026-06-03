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
      title: 'Terapia Especializada',
      desc: 'Sesiones confidenciales y personalizadas con psicólogas licenciadas expertas en contención y bienestar emocional para mujeres.'
    },
    {
      icon: 'https://cdn-icons-png.flaticon.com/512/3064/3064197.png',
      title: 'Comunidad Segura',
      desc: 'Un foro de apoyo mutuo, libre de juicios y 100% moderado, para compartir experiencias de superación, resiliencia y salud mental.'
    },
    {
      icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      title: 'Autocuidado Diario',
      desc: 'Accede a diarios de emociones, guías de respiración y meditaciones de mindfulness diseñadas para mitigar la ansiedad.'
    },
    {
      icon: 'https://cdn-icons-png.flaticon.com/512/10707/10707886.png',
      title: 'Privacidad y Confianza',
      desc: 'Tu seguridad es nuestra prioridad. Ofrecemos encriptación total de extremo a extremo en tus mensajes y perfil.'
    }
  ];

  readonly stats = [
    { value: '15K+', label: 'Mujeres Apoyadas', desc: 'Que han encontrado guía y contención emocional en AURA.' },
    { value: '45+', label: 'Psicólogas Activas', desc: 'Especializadas en salud mental femenina y crisis cotidianas.' },
    { value: '24/7', label: 'Moderación Activa', desc: 'Monitoreo constante del foro para mantener el espacio seguro y libre de acoso.' },
    { value: '100%', label: 'Confidencial', desc: 'Sesiones individuales privadas y anónimas si así lo prefieres.' }
  ];

  readonly tips = [
    {
      title: 'Validación de Emociones',
      desc: 'Sentir tristeza, rabia o miedo es humano. Date permiso para experimentar tus sentimientos sin juzgarte.'
    },
    {
      title: 'La Regla del 4-7-8',
      desc: 'Inhala aire en 4 segundos, mantén la respiración durante 7 segundos y exhala lentamente en 8 segundos para calmar tu sistema nervioso.'
    },
    {
      title: 'Establece Límites Sanos',
      desc: 'Decir "no" es una forma de autocuidado. Definir qué permites en tu vida protege tu paz mental de forma incondicional.'
    }
  ];
}