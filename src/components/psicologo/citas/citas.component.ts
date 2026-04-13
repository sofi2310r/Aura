import { Component } from '@angular/core';
import { OnInit } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { CitaService } from '../../../services/cita.service';
import Swal from 'sweetalert2';
import { ChangeDetectorRef } from '@angular/core';

@Component({
    selector: 'app-citas',
    standalone: false,
    templateUrl: './citas.component.html',
    styleUrl: './citas.component.css'
})
export class CitasComponent implements OnInit {
  pacientes: any[] = [];
    psicologos: any[] = [];

    pacienteSeleccionado: any = null;
    psicologoSeleccionado: any = null;

    fecha: string = '';
    motivo: string = '';

    citas: any[] = [];

    constructor(
        private userService: UserService,
        private authService: AuthService,
        private citaService: CitaService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {

        this.userService.getUsers().subscribe(users => {
            this.pacientes = users.filter(u => u.rol === 'paciente');
            this.psicologos = users.filter(u => u.rol === 'psicologo');
        });

        this.citaService.getCitas().subscribe(c => {
            this.citas = c;
        });
    }

    crearCita() {

        // 🔥 VALIDACIÓN
        if (
            !this.pacienteSeleccionado ||
            !this.psicologoSeleccionado ||
            !this.fecha ||
            !this.motivo.trim()
        ) {
            Swal.fire('Campos incompletos', 'Completa todos los campos', 'warning');
            return;
        }

        const user = this.authService.getCurrentUser();
        if (!user) return;

        // 🔥 VALIDAR DISPONIBILIDAD
        const hayConflicto = this.citaService.validarDisponibilidad(
            this.fecha,
            this.psicologoSeleccionado.nombre
        );

        if (hayConflicto) {
            Swal.fire('Horario no disponible', 'Este psicólogo ya tiene una cita en esa fecha', 'error');
            return;
        }

        // 🔥 CITA LOCAL (FRONTEND)
        const idTemp = 'temp-' + Date.now();

        const nuevaCita = {
            id: idTemp,
            paciente: this.pacienteSeleccionado.nombre,
            psicologo: this.psicologoSeleccionado.nombre,
            fecha: this.fecha,
            motivo: this.motivo.trim()
        };

        // UI optimista con estado local
        this.citas = [
            { ...nuevaCita, estado: 'pendiente' },
            ...this.citas
        ];

        const backup = [...this.citas];

        this.limpiarCampos();

        // 🔥 PAYLOAD LIMPIO (SIN ESTADO)
        const payload = {
            paciente: nuevaCita.paciente,
            psicologo: nuevaCita.psicologo,
            fecha: nuevaCita.fecha,
            motivo: nuevaCita.motivo
        };

        this.citaService.addCita(payload).subscribe({
            next: (realCita) => {
                this.citas = this.citas.map(c =>
                    c.id === idTemp ? realCita : c
                );
            },
            error: () => {
                this.citas = backup.filter(c => c.id !== idTemp);
                Swal.fire('Error', 'No se pudo guardar la cita', 'error');
            }
        });
    }

    eliminar(id: string) {

        Swal.fire({
            title: '¿Eliminar cita?',
            text: "No podrás recuperarla",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar'
        }).then((result) => {

            if (result.isConfirmed) {

                const backup = [...this.citas];
                this.citas = this.citas.filter(c => c.id !== id);

                this.cdr.detectChanges();

                this.citaService.removeCita(id).subscribe({
                    next: () => {
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            timer: 2000,
                            showConfirmButton: false,
                            icon: 'success',
                            title: 'Cita eliminada'
                        });
                    },
                    error: () => {
                        this.citas = backup;
                        this.cdr.detectChanges();
                        Swal.fire('Error', 'No se pudo eliminar', 'error');
                    }
                });
            }
        });
    }

    confirmarCita(cita: any) {

        const backup = [...this.citas];

        this.citas = this.citas.map(c =>
            c.id === cita.id ? { ...c, estado: 'confirmada' } : c
        );

        this.citaService.updateCita(cita.id, { estado: 'confirmada' }).subscribe({
            error: () => {
                this.citas = backup;
                Swal.fire('Error', 'No se pudo confirmar la cita', 'error');
            }
        });
    }

    get totalPendientes(): number {
        return this.citas.filter(c => c.estado === 'pendiente').length;
    }

    private limpiarCampos() {
        this.pacienteSeleccionado = null;
        this.psicologoSeleccionado = null;
        this.fecha = '';
        this.motivo = '';
    }
    get citasDeHoy(): any[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    return this.citas.filter(c => {
        const fechaCita = new Date(c.fecha);
        return fechaCita >= hoy && fechaCita < manana;
    });
}

get citasNoHoy(): any[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    return this.citas.filter(c => {
        const fechaCita = new Date(c.fecha);
        return !(fechaCita >= hoy && fechaCita < manana);
    });
}
}