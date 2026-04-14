import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { ForoService } from "../../../services/foro.service";
import { Publicacion } from "../../../services/foro.service";
import { Comentario } from "../../../services/foro.service";
import { UserService } from "../../../services/user.service";
import Swal from "sweetalert2";

@Component({
    selector: 'app-reportes',
    standalone: false,
    templateUrl: './reportes.component.html',
    styleUrl: './reportes.component.css'
})
export class Reportes implements OnInit {
    reportes: {
        publicacion: Publicacion,
        comentario: Comentario,
        index: number
    }[] = [];

    constructor(private foroService: ForoService,
        private userService: UserService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.foroService.getPublicaciones().subscribe(pubs => {
            // Creamos una lista temporal para no afectar la vista de inmediato
            const nuevosReportes: any[] = [];

            pubs.forEach(pub => {
                pub.comentarios?.forEach((comentario: any, i: number) => {
                    if (comentario.reportado) {
                        nuevosReportes.push({
                            publicacion: pub,
                            comentario,
                            index: i
                        });
                    }
                });
            });

            // Solo actualizamos si la cantidad cambió o es la primera carga
            // Esto evita que la pantalla se "refresque" innecesariamente
            this.reportes = nuevosReportes;
        });
    }

    eliminarComentario(pub: any, index: number) {
        Swal.fire({
            title: '¿Eliminar comentario?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar'
        }).then((result) => {
            if (result.isConfirmed) {

                // --- PASO 1: CARGA INSTANTÁNEA ---
                // Eliminamos el reporte visualmente de inmediato
                this.reportes = this.reportes.filter(r => !(r.publicacion.id === pub.id && r.index === index));

                this.cdr.detectChanges(); // Forzar actualización visual

                // --- PASO 2: PROCESO POR DETRÁS ---
                const nuevosComentarios = [...pub.comentarios];
                nuevosComentarios.splice(index, 1);

                const payload: any = {
                    ...pub,
                    comentarios: nuevosComentarios
                };

                this.foroService.actualizarPublicacion(pub.id, payload).subscribe({
                    next: () => {
                        this.notificacionExito('Eliminado');
                    },
                    error: () => {
                        // Si falla, podrías recargar para que el usuario vea que no se borró
                        Swal.fire('Error', 'No se pudo sincronizar con el servidor', 'error');
                    }
                });
            }
        });
    }

    ignorarReporte(pub: any, index: number) {
        // 1. Quitar de la vista YA
        this.reportes = this.reportes.filter(r =>
            !(r.publicacion.id === pub.id && r.index === index)
        );

        // 2. Actualizar en Firebase por detrás
        const nuevosComentarios = [...pub.comentarios];
        nuevosComentarios[index].reportado = false;

        const payload: any = {
            ...pub,
            comentarios: nuevosComentarios
        };

        this.foroService.actualizarPublicacion(pub.id, payload).subscribe();
    }

    bloquearUsuario(autorId: string, pubId: string, index: number) {
        if (!autorId) {
            Swal.fire('Error', 'No se encontró el ID del autor', 'error');
            return;
        }

        Swal.fire({
            title: '¿Confirmar sanción automática?',
            text: "Se aplicará un bloqueo progresivo basado en el historial del usuario.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, sancionar',
            confirmButtonColor: '#dc2626'
        }).then((result) => {
            if (result.isConfirmed) {
                this.userService.getUserById(autorId).subscribe((usuario: any) => { // Añadimos : any aquí
                    if (!usuario) return;

                    // Ahora TypeScript permitirá leer contadorReportes
                    const nuevosReportes = (usuario.contadorReportes || 0) + 1;
                    let fechaDesbloqueo: Date | null = new Date();
                    let mensajeSancion = "";

                    switch (nuevosReportes) {
                        case 1:
                            fechaDesbloqueo.setHours(fechaDesbloqueo.getHours() + 24);
                            mensajeSancion = "Bloqueado por 24 horas";
                            break;
                        case 2:
                            fechaDesbloqueo.setDate(fechaDesbloqueo.getDate() + 7);
                            mensajeSancion = "Bloqueado por 1 semana";
                            break;
                        case 3:
                            fechaDesbloqueo.setMonth(fechaDesbloqueo.getMonth() + 1);
                            mensajeSancion = "Bloqueado por 1 mes";
                            break;
                        default:
                            fechaDesbloqueo = null;
                            mensajeSancion = "Bloqueo PERMANENTE";
                            break;
                    }

                    const updatePayload: any = {
                        uid: autorId,
                        activo: false,
                        contadorReportes: nuevosReportes,
                        fechaDesbloqueo: fechaDesbloqueo ? fechaDesbloqueo.toISOString() : 'permanente'
                    };

                    this.userService.updateUser(updatePayload).subscribe({
                        next: () => {
                            this.reportes = this.reportes.filter(r =>
                                !(r.publicacion.id === pubId && r.index === index)
                            );
                            this.cdr.detectChanges();
                            this.notificacionExito(mensajeSancion);
                            this.eliminarComentarioSilencioso(pubId, index);
                        }
                    });
                });
            }
        });
    }

    // Corregido para usar getPublicaciones() y filtrar manualmente
    private eliminarComentarioSilencioso(pubId: string, index: number) {
        this.foroService.getPublicaciones().subscribe((pubs: any[]) => {
            const pub = pubs.find(p => p.id === pubId);
            if (pub && pub.comentarios) {
                const nuevosComentarios = [...pub.comentarios];
                nuevosComentarios.splice(index, 1);

                const payload = { ...pub, comentarios: nuevosComentarios };
                this.foroService.actualizarPublicacion(pubId, payload).subscribe();
            }
        });
    }
    private notificacionExito(mensaje: string) {
        Swal.fire({
            icon: 'success',
            title: mensaje,
            timer: 1200,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    }
}