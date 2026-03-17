import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer>
      <p>Sistema AURA © 2026</p>
      <p>@AURA - {{ titulo }}</p>
    </footer>
  `,
  styles: [`
    footer {
      background: linear-gradient(135deg, #5b3a7d 0%, #2fa98f 100%);
      color: white;
      padding: 25px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    }

    footer p {
      margin: 0;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      footer {
        flex-direction: column;
        gap: 10px;
        text-align: center;
      }
    }
  `]
})
export class FooterAdminComponent {
  @Input() titulo = 'Panel de Administración';
}
