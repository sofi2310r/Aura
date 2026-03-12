import { Component } from '@angular/core';
import { AutenticacionService } from '../services/autenticacion';

@Component({
  selector: 'app-inicio-sesion',
  standalone: false,
  templateUrl: './inicio-sesion.html',
  styleUrl: './inicio-sesion.css',
})
export class InicioSesion {

  email: string = '';
  password: string = '';
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private autenticacionService: AutenticacionService) {}

  login() {
    this.errorMessage = 'error de sintaxis :)';
    this.successMessage = '';
    this.autenticacionService.iniciarSesion(this.email, this.password)
      .then((result: any) => {
        this.successMessage = '¡Inicio de sesión exitoso!';
      })
      .catch((error: any) => {
        this.errorMessage = error.message || 'Error de autenticación';
      });
  }

}



