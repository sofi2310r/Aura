import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class NotificacionService {

  private notificacion$ = new Subject<string>();

  enviar(mensaje: string) {
    this.notificacion$.next(mensaje);
  }

  getNotificaciones() {
    return this.notificacion$.asObservable();
  }
}