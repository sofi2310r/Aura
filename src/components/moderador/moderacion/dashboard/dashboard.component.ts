import { Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core";
import { ForoService } from "../../../../services/foro.service";
import { UserService } from "../../../../services/user.service";
import { AuthService } from "../../../../services/auth.service"; // Importado
import { User } from "../../../../models/user.model";
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-dashboard',
    standalone: false,
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class Dashboard implements OnInit, OnDestroy {
    // Métricas del Moderador
    totalUsuarios = 0;
    publicaciones = 0;
    reportes = 0;
    comentariosReportados = 0;

    // Lógica de Configuración/Perfil
    isConfigRoute = false;
    moderadorUser: User | null = null;
    nombre = '';
    apellido = '';
    correo = '';
    nuevaClave = '';
    mensaje = '';
    errorMessage = '';

    private subscriptions = new Subscription();

    constructor(
        private readonly foroService: ForoService,
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.cargarEstadisticas();
        this.cargarDatosModerador();
    }

    private cargarEstadisticas(): void {
        // 1. Usuarios
        this.subscriptions.add(
            this.userService.getUsers().subscribe(users => {
                this.totalUsuarios = users.length;
                this.cdr.detectChanges();
            })
        );

        // 2. Publicaciones y Reportes
        this.subscriptions.add(
            this.foroService.getPublicaciones().subscribe(pubs => {
                this.publicaciones = pubs.length;
                this.reportes = pubs.reduce((total, pub) => {
                    const reportadosEnPub = pub.Comentarios?.filter(c => c.reportado).length || 0;
                    return total + reportadosEnPub;
                }, 0);
                this.cdr.detectChanges();
            })
        );
    }

    cargarDatosModerador(): void {
        const usuarioActual = this.authService.getCurrentUser();
        if (usuarioActual) {
            this.moderadorUser = usuarioActual;
            this.nombre = usuarioActual.nombre;
            this.apellido = usuarioActual.apellido;
            this.correo = usuarioActual.correo;
            this.cdr.detectChanges();
        }
    }

    // --- MÉTODOS DE NAVEGACIÓN INTERNA ---
    activarConfiguracion(): void {
        this.isConfigRoute = true;
        this.cdr.detectChanges();
    }

    activarInicio(): void {
        this.isConfigRoute = false;
        this.cdr.detectChanges();
    }

    // --- MÉTODOS DE CONFIGURACIÓN (Lógica copiada del Admin) ---
    guardarCambiosPerfil(): void {
        if (!this.moderadorUser) return;

        const usuarioActualizado: User = {
            ...this.moderadorUser,
            nombre: this.nombre,
            apellido: this.apellido
        };

        this.subscriptions.add(
            this.userService.updateUser(usuarioActualizado).subscribe({
                next: (user) => {
                    this.moderadorUser = user;
                    this.mensaje = '✅ Perfil actualizado correctamente.';
                    this.errorMessage = '';
                    this.cdr.detectChanges();
                    setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 3000);
                },
                error: (err) => {
                    this.errorMessage = 'Error al actualizar: ' + err.message;
                    this.cdr.detectChanges();
                }
            })
        );
    }

    actualizarPassword(): void {
        if (this.nuevaClave.length < 6) {
            this.errorMessage = 'La clave debe tener al menos 6 caracteres.';
            this.cdr.detectChanges();
            return;
        }

        this.authService.updatePassword(this.nuevaClave).then(() => {
            this.mensaje = '✅ Contraseña actualizada correctamente.';
            this.errorMessage = '';
            this.nuevaClave = '';
            this.cdr.detectChanges();
        }).catch(err => {
            this.errorMessage = 'Error: ' + err.message;
            this.cdr.detectChanges();
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
}