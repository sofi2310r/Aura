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
    pacienteSeleccionado: any = null;

    fecha: string = '';
    motivo: string = '';

    citas: any[] = [];

    constructor(
        private userService: UserService,
        private authService: AuthService,
        private citaService: CitaService,
        private readonly cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.userService.getUsers().subscribe(users => {
            this.pacientes = users.filter(u => u.rol === 'paciente');
        });

        this.citaService.getCitas().subscribe(c => {
            this.citas = c;
        });
    }

    crearCita() {
        // 1. Validaciones básicas de campos vacíos
        if (!this.pacienteSeleccionado || !this.fecha || !this.motivo.trim()) {
            Swal.fire('Campos incompletos', 'Completa todos los campos', 'warning');
            return;
        }

        const user = this.authService.getCurrentUser();
        if (!user) return;

        // 2. VALIDACIÓN DE DISPONIBILIDAD (CRUCIAL: Antes de tocar la lista)
        // Pasamos la fecha del input y el nombre del psicólogo (usuario actual)
        const hayConflicto = this.citaService.validarDisponibilidad(this.fecha, user.nombre);

        if (hayConflicto) {
            Swal.fire({
                icon: 'error',
                title: 'Horario no disponible',
                text: 'Ya tienes una cita programada para esta fecha y hora exactas.'
            });
            return; // Detenemos la ejecución aquí
        }

        // 3. Si no hay conflicto, procedemos con la creación optimista
        const idTemp = 'temp-' + Date.now();
        const nuevaCita = {
            id: idTemp,
            paciente: this.pacienteSeleccionado.nombre,
            psicologo: user.nombre,
            fecha: this.fecha,
            motivo: this.motivo.trim(),
            estado: 'pendiente' as 'pendiente'
        };

        this.citas = [nuevaCita, ...this.citas];
        const backup = [...this.citas];
        this.limpiarCampos();

        const { id, ...payload } = nuevaCita;
        this.citaService.addCita(payload).subscribe({
            next: (realCita) => {
                this.citas = this.citas.map(c => c.id === idTemp ? realCita : c);
            },
            error: (err) => {
                this.citas = backup.filter(c => c.id !== idTemp);
                Swal.fire('Error', 'No se pudo guardar la cita.', 'error');
            }
        });
    }

    eliminar(id: string) {
        Swal.fire({
            title: '¿Estás segura?',
            text: "La cita se borrará permanentemente.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff4d4d',
            cancelButtonColor: '#6c63ff',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                const backupCitas = [...this.citas];

                // 2. ACTUALIZACIÓN OPTIMISTA E INMEDIATA
                this.citas = this.citas.filter(c => c.id !== id);

                // 3. FORZAR ACTUALIZACIÓN DE PANTALLA
                this.cdr.detectChanges();

                this.citaService.removeCita(id).subscribe({
                    next: () => {
                        // Usamos un Toast para no interrumpir el flujo del psicólogo
                        const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 2000
                        });
                        Toast.fire({ icon: 'success', title: 'Cita eliminada' });
                    },
                    error: (err) => {
                        this.citas = backupCitas;
                        this.cdr.detectChanges(); // Revertimos visualmente
                        Swal.fire('Error', 'No se pudo eliminar: ' + err.message, 'error');
                    }
                });
            }
        });
    }

    confirmarCita(cita: any) {
        // GUARDAMOS UN BACKUP por si el servidor falla
        const backupCitas = [...this.citas];

        // ACTUALIZACIÓN OPTIMISTA: Cambiamos el estado en la UI de inmediato
        this.citas = this.citas.map(c =>
            c.id === cita.id ? { ...c, estado: 'confirmada' } : c
        );

        // Llamamos al servicio en segundo plano
        this.citaService.updateCita(cita.id, { estado: 'confirmada' }).subscribe({
            next: () => {
                // No hacemos nada, la UI ya está actualizada
                console.log('Servidor actualizado con éxito');
            },
            error: (err) => {
                // SI FALLA, REVERTIMOS AL ESTADO ANTERIOR
                this.citas = backupCitas;
                Swal.fire({
                    icon: 'error',
                    title: 'Error de conexión',
                    text: 'No se pudo confirmar la cita. Reintentando...'
                });
            }
        });
    }

    get totalPendientes(): number {
        return this.citas.filter(cita => cita.estado === 'pendiente').length;
    }

    private limpiarCampos() {
        this.fecha = '';
        this.motivo = '';
        this.pacienteSeleccionado = null;
    }
}