import { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { CitaService } from '../../../services/cita.service';
import { AuthService } from '../../../services/auth.service'; // Importamos AuthService
import { User } from '../../../models/user.model';

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
    fechaActual = new Date();
    fechaActualTexto = '';
    saludo = 'Bienvenido';
    usuarioActual: User | null = null; // Para mostrar el nombre

    constructor(
        private userService: UserService,
        private citaService: CitaService,
        private authService: AuthService // Inyectamos el servicio
    ) { }

    ngOnInit(): void {
        this.usuarioActual = this.authService.getCurrentUser();
        this.saludo = this.obtenerSaludo();
        
        // Personalizamos el saludo si tenemos el nombre
        if (this.usuarioActual?.nombre) {
            this.saludo = `${this.saludo}, ${this.usuarioActual.nombre}`;
        }

        this.fechaActualTexto = this.fechaActual.toLocaleDateString('es-CO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        this.cargarEstadisticas();
    }

    private cargarEstadisticas(): void {
        const uidActual = this.usuarioActual?.uid;

        // Filtramos estadísticas solo para este psicólogo si es necesario
        this.citaService.getCitas().subscribe(citas => {
            // Si quieres que el psicólogo solo vea sus propias estadísticas:
            // const misCitas = citas.filter(c => c.psicologoUid === uidActual);
            this.totalCitas = citas.length;
            this.totalPendientes = citas.filter(c => c.estado === 'pendiente').length;
        });

        this.userService.getUsers().subscribe(users => {
            this.totalPacientes = users.filter(u => {
                const role = (u.rol || u.role || '').toString().toLowerCase();
                return role === 'paciente' || role === 'usuario';
            }).length;
        });
    }

    private obtenerSaludo(): string {
        const hora = new Date().getHours();
        if (hora < 12) return 'Buenos días';
        if (hora < 18) return 'Buenas tardes';
        return 'Buenas noches';
    }
}