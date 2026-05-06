import { Component, OnInit, OnDestroy } from "@angular/core";
import { ForoService } from "../../../../services/foro.service";
import { Router } from "@angular/router";
import { AuthService } from "../../../../services/auth.service";
import { UserService } from "../../../../services/user.service";
import { Subscription, take } from "rxjs";
import Swal from "sweetalert2";
import { User } from "../../../../models/user.model";

@Component({
    selector: 'app-layout',
    standalone: false,
    templateUrl: './layout.component.html',
    styleUrl: './layoaut.component.css'
})
export class Layout implements OnInit, OnDestroy {
    reportesPendientes = 0;
    isConfigRoute: boolean = false;
    isSidebarVisible: boolean = false;
    isSaving: boolean = false;

    // --- VARIABLES DE VISUALIZACIÓN (SIDEBAR) ---
    nombreDisplay: string = '';
    correoDisplay: string = '';

    // --- VARIABLES DE EDICIÓN (FORMULARIO) ---
    nombreEdit: string = '';
    apellidoEdit: string = '';
    correoEdit: string = '';
    nuevaClave: string = '';

    mensaje: string = '';
    errorMessage: string = '';

    private sub: Subscription | null = null;
    private userSub: Subscription | null = null;

    constructor(
        private foroService: ForoService,
        private authService: AuthService,
        private userService: UserService,
        private router: Router
    ) { }

    toggleSidebar() {
        this.isSidebarVisible = !this.isSidebarVisible;
    }

    activarDashboard() {
        this.isConfigRoute = false;
    }

    activarConfiguracion() {
        this.isConfigRoute = true;
    }

    logout() {
        this.authService.logout();
        this.router.navigate(['/login']); // Redirección tras logout
    }

    ngOnInit(): void {
        // 1. Suscripción a reportes (Foro)
        this.sub = this.foroService.getPublicaciones().subscribe(pubs => {
            this.reportesPendientes = pubs.reduce((total, pub) => {
                const reportadosEnEstaPub = pub.Comentarios?.filter(c => c.reportado).length || 0;
                return total + reportadosEnEstaPub;
            }, 0);
        });

        // 2. CARGA DE DATOS REALES
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.uid) {
            this.userSub = this.userService.getUserById(currentUser.uid).subscribe(user => {
                if (user) {
                    // La Sidebar siempre refleja la realidad de la DB
                    this.nombreDisplay = user.nombre || 'Usuario Aura';
                    this.correoDisplay = user.correo || '';

                    // CORRECCIÓN: Los inputs solo se sincronizan si NO estamos guardando
                    // Esto elimina el comportamiento de "doble clic"
                    if (!this.isSaving) {
                        this.nombreEdit = user.nombre || '';
                        this.apellidoEdit = user.apellido || '';
                        this.correoEdit = user.correo || '';
                    }

                    if (user.activo === false) {
                        this.expulsarUsuario(user);
                    }
                }
            });
        }
    }

  guardarCambiosPerfil(event?: Event) {
    if (event) event.preventDefault();

    const currentUser = this.authService.getCurrentUser();
    if (this.isSaving || !currentUser?.uid) return;

    // 1. ACTUALIZACIÓN OPTIMISTA (Inmediata para el usuario)
    const nombreAnterior = this.nombreDisplay;
    this.nombreDisplay = this.nombreEdit; 
    
    this.isSaving = true;
    this.mensaje = '';

    this.userService.getUserById(currentUser.uid).pipe(take(1)).subscribe({
        next: (userDoc) => {
            if (userDoc && userDoc.id) {
                const dataToUpdate = {
                    nombre: this.nombreEdit,
                    apellido: this.apellidoEdit
                };

                this.userService.updateUser(userDoc.id, dataToUpdate).pipe(take(1)).subscribe({
                    next: () => {
                        this.mensaje = '¡Guardado!';
                        this.isSaving = false;
                        setTimeout(() => this.mensaje = '', 2000);
                    },
                    error: (err) => {
                        // 2. ROLLBACK: Si falla el servidor, devolvemos el nombre viejo
                        this.nombreDisplay = nombreAnterior;
                        this.errorMessage = 'Error al sincronizar';
                        this.isSaving = false;
                    }
                });
            } else {
                this.isSaving = false;
                this.nombreDisplay = nombreAnterior;
            }
        },
        error: () => {
            this.isSaving = false;
            this.nombreDisplay = nombreAnterior;
        }
    });
}
    actualizarPassword() {
        if (this.nuevaClave.length < 6) {
            this.errorMessage = 'Mínimo 6 caracteres';
            return;
        }

        this.authService.updatePassword(this.nuevaClave)
            .then(() => {
                this.mensaje = 'Contraseña actualizada';
                this.nuevaClave = '';
                setTimeout(() => this.mensaje = '', 3000);
            })
            .catch(() => this.errorMessage = 'Error al actualizar contraseña');
    }

    private expulsarUsuario(user: any) {
        this.ngOnDestroy();
        Swal.fire({
            title: 'Sesión finalizada',
            text: user.fechaDesbloqueo === 'permanente.'
                ? 'Tu cuenta ha sido bloqueada permanentemente.'
                : `Tu cuenta ha sido bloqueada hasta: ${user.fechaDesbloqueo || 'revisión'}`,
            icon: 'error',
            allowOutsideClick: false,
            confirmButtonText: 'Entendido'
        }).then(() => {
            this.authService.logout();
            this.router.navigate(['/login']);
        });
    }

    ngOnDestroy(): void {
        if (this.sub) this.sub.unsubscribe();
        if (this.userSub) this.userSub.unsubscribe();
    }
}