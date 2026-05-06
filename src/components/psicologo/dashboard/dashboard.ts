import { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { CitaService } from '../../../services/cita.service';

@Component({
    selector: 'app-dashboard',
    standalone: false, // Declarado como no-standalone
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
    totalPacientes = 0;
    totalCitas = 0;
    totalPendientes = 0;
    totalMensajes = 0;
    fechaActual = new Date();
    fechaActualTexto = '';
    saludo = 'Bienvenido';

    constructor(
        private userService: UserService,
        private citaService: CitaService
    ) { }

    ngOnInit(): void {
        this.saludo = this.obtenerSaludo();
        this.fechaActualTexto = this.fechaActual.toLocaleDateString('es-CO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        this.cargarEstadisticas();
    }

    private cargarEstadisticas(): void {
        // 1. Escuchar cambios en las CITAS y PENDIENTES
        this.citaService.getCitas().subscribe(citas => {
            this.totalCitas = citas.length;
            // Filtramos las citas con estado pendiente en tiempo real
            this.totalPendientes = citas.filter(c => c.estado === 'pendiente').length;
        });

        // 2. Escuchar cambios en los PACIENTES
        this.userService.getUsers().subscribe(users => {
            this.totalPacientes = users.filter(u => {
                // Manejamos 'rol' o 'role' para evitar errores de consistencia
                const role = (u.rol || u.role || '').toString().toLowerCase();
                return role === 'paciente' || role === 'usuario';
            }).length;
        });

        // Placeholder para mensajes (puedes conectar tu servicio de chat aquí más adelante)
        this.totalMensajes = 0;
    }

    private obtenerSaludo(): string {
        const hora = new Date().getHours();
        if (hora < 12) return 'Buenos días';
        if (hora < 18) return 'Buenas tardes';
        return 'Buenas noches';
    }
}