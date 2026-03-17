import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { Cita, CitaService } from '../../../services/cita.service';

@Component({
  selector: 'app-citas',
  standalone: false,
  templateUrl: './citas.component.html',
  styleUrl: './citas.component.css',
})
export class CitasComponent {
  readonly citas$: Observable<Cita[]>;

  paciente = '';
  psicologo = 'Camilo Rojas';
  fecha = '';
  motivo = '';
  mensaje = '';

  constructor(private readonly citaService: CitaService) {
    this.citas$ = this.citaService.getCitas();
  }

  crearCita(): void {
    if (!this.paciente.trim() || !this.psicologo.trim() || !this.fecha || !this.motivo.trim()) {
      this.mensaje = 'Completa todos los datos de la cita.';
      return;
    }

    this.citaService
      .addCita({
        paciente: this.paciente,
        psicologo: this.psicologo,
        fecha: this.fecha,
        motivo: this.motivo,
      })
      .subscribe({
        next: () => {
          this.mensaje = 'Cita guardada en Firebase.';
          this.paciente = '';
          this.fecha = '';
          this.motivo = '';
        },
        error: (error: Error) => {
          this.mensaje = error.message;
        },
      });
  }

  eliminarCita(id: string): void {
    this.citaService.removeCita(id).subscribe({
      next: () => {
        this.mensaje = 'Cita eliminada del backend.';
      },
      error: (error: Error) => {
        this.mensaje = error.message;
      },
    });
  }
}