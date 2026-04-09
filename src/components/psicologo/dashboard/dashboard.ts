import { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { CitaService } from '../../../services/cita.service';

@Component({
    selector: 'app-dashboard',
    standalone: false,
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
    totalPacientes = 0;
    totalCitas = 0;
    totalPendientes = 0;
    totalMensajes = 0;

    constructor(
        private userService: UserService,
        private citaService: CitaService
    ) { }

    ngOnInit(): void {
        // 1. Escuchar cambios en las CITAS y PENDIENTES
        this.citaService.getCitas().subscribe(citas => {
            this.totalCitas = citas.length;
            // Filtramos las pendientes en tiempo real
            this.totalPendientes = citas.filter(c => c.estado === 'pendiente').length;
        });

        // 2. Escuchar cambios en los PACIENTES
        this.userService.getUsers().subscribe(users => {
            this.totalPacientes = users.filter(u => u.rol === 'paciente').length;
        });
    }

    cargarDatos() {
        this.userService.getUsers
            ().subscribe(users => {
                const pacientes = users.filter(u => u.rol === 'paciente');

                this.totalPacientes = pacientes.length;
                this.totalPendientes = pacientes.filter(p => !p.activo).length;
            });

        this.citaService.getCitas().subscribe(citas => {
            this.totalCitas = citas.length;
        });

        this.totalMensajes = 2;
    }
}