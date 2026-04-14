import { Injectable, NgZone } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SessionTimeoutService {
  private readonly INACTIVITY_EVENTS = [
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
    'click'
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly ngZone: NgZone
  ) {
    this.setupActivityMonitoring();
  }

  /**
   * Configura el monitoreo de actividad del usuario
   * Refresca el timeout de sesión cuando hay interacción del usuario
   */
  private setupActivityMonitoring(): void {
    this.ngZone.runOutsideAngular(() => {
      this.INACTIVITY_EVENTS.forEach((event) => {
        document.addEventListener(event, () => {
          this.authService.refreshSessionTimeout();
        }, { passive: true });
      });
    });
  }
}
