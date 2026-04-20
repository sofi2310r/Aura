import { Component, OnInit } from "@angular/core";
import { UserService } from "../../../services/user.service";
import { ChangeDetectorRef } from "@angular/core";
import Swal from "sweetalert2";

@Component({
    selector: 'app-pacientes',
    standalone: false,
    templateUrl: './pacientes.component.html',
    styleUrl: './pacientes.component.css'
})
export class PacientesComponent implements OnInit {
    pacientes: any[] = [];
    pacientesFiltrados: any[] = [];

    buscador: string = '';

    constructor(
        private userService: UserService,
        private cdr: ChangeDetectorRef
    ) {
    }

    ngOnInit(): void {
        this.cargarPacientes();
    }
    cargarPacientes() {
        this.userService.getUsers().subscribe(users => {
            this.pacientes = users.filter(u => u.rol === 'paciente');
            this.pacientesFiltrados = [...this.pacientes];
        });
    }

    filtrar() {
        const texto = this.buscador.toLowerCase();

        this.pacientesFiltrados = this.pacientes.filter(p =>
            p.nombre.toLowerCase().includes(texto) ||
            p.correo.toLowerCase().includes(texto)
        );
    }

    eliminar(paciente: any) {
        Swal.fire({
            title: '¿Eliminar paciente?',
            text: `Estás a punto de eliminar a: ${paciente.nombre}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#6c63ff',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(result => {
            if (result.isConfirmed) {
                // BACKUPS
                const backupOriginal = [...this.pacientes];
                const backupFiltrados = [...this.pacientesFiltrados];

                // ACTUALIZACIÓN OPTIMISTA
                this.pacientes = this.pacientes.filter(p => p.id !== paciente.id);
                this.pacientesFiltrados = this.pacientesFiltrados.filter(p => p.id !== paciente.id);

                // --- EL TRUCO PARA LA VELOCIDAD ---
                // Forzamos a Angular a quitar la fila del HTML YA MISMO
                this.cdr.detectChanges();

                // LLAMADA AL SERVICIO (Ahora puede demorar lo que quiera de fondo)
                this.userService.removeUser(paciente.id).subscribe({
                    next: () => {
                        // Solo un toast pequeño que no bloquee
                        const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 2000,
                            timerProgressBar: true
                        });
                        Toast.fire({ icon: 'success', title: 'Paciente eliminado' });
                    },
                    error: (err) => {
                        // ROLLBACK
                        this.pacientes = backupOriginal;
                        this.pacientesFiltrados = backupFiltrados;
                        this.cdr.detectChanges(); // Refrescamos para que reaparezca
                        Swal.fire('Error', 'No se pudo eliminar del servidor', 'error');
                    }
                });
            }
        });
    }
}