import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar-psicologo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="topbar">
      <a class="navbar-brand" routerLink="/">
        <img
          src="https://i.ibb.co/1YrgLzYR/logo.png"
          alt="Aura Web Logo"
          width="50"
          height="auto"
        />
      </a>
      <h2 class="topbar-title">{{ titulo }}</h2>
      <button class="btn-logout" (click)="cerrarSesion()" title="Cerrar sesión">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
        </svg>
      </button>
    </div>
  `,
  styles: [`
    .topbar {
      height: 70px;
      background: linear-gradient(135deg, #5f2c82 0%, #00c9a7 100%);
      margin: 0;
      border-radius: 0;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      padding: 0 40px;
      gap: 20px;
      justify-content: flex-end;
    }

    .navbar-brand {
      display: flex;
      align-items: center;
      text-decoration: none;
      cursor: pointer;
      flex-shrink: 0;
      margin-right: auto;
    }

    .navbar-brand img {
      height: 50px;
      width: auto;
      opacity: 0.95;
      transition: opacity 0.3s ease;
    }

    .navbar-brand:hover img {
      opacity: 1;
    }

    .topbar-title {
      color: white;
      font-size: 22px;
      font-weight: 600;
      margin: 0;
      letter-spacing: 0.5px;
      flex: 1;
      text-align: center;
    }

    .btn-logout {
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.4);
      color: white;
      width: 45px;
      height: 45px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      flex-shrink: 0;
    }

    .btn-logout:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.6);
    }

    .btn-logout:active {
      transform: scale(0.95);
    }

    .btn-logout svg {
      width: 24px;
      height: 24px;
    }
  `]
})
export class NavbarPsicologoComponent {
  @Input() titulo = 'Panel de Psicólogo';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
