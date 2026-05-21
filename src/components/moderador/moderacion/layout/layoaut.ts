import { Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core";
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
    
    // 🔒 Control de bloqueo de inputs
    editandoCampos: boolean = false; 

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

    // Copia de respaldo para restaurar si el usuario cancela la edición
    private nombreBackup: string = '';
    private apellidoBackup: string = '';

    private sub: Subscription | null = null;
    private userSub: Subscription | null = null;

    constructor(
        private foroService: ForoService,
        private authService: AuthService,
        private userService: UserService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    toggleSidebar() {
        this.isSidebarVisible = !this.isSidebarVisible;
    }

    activarDashboard() {
        this.isConfigRoute = false;
    }

    activarConfiguracion() {
        this.isConfigRoute = true;
        this.editandoCampos = false; // Asegura que empiece bloqueado al entrar
    }

    // Activa los inputs al presionar el lápiz
    habilitarEdicion(): void {
        this.nombreBackup = this.nombreEdit;
        this.apellidoBackup = this.apellidoEdit;
        this.editandoCampos = true;
        this.cdr.detectChanges();
    }

    // Cancela y restaura los valores anteriores
    cancelarEdicion(): void {
        this.nombreEdit = this.nombreBackup;
        this.apellidoEdit = this.apellidoBackup;
        this.editandoCampos = false;
        this.cdr.detectChanges();
    }

    logout() {
        this.authService.logout();
        this.router.navigate(['/login']); 
    }

    ngOnInit(): void {
        // 1. Suscripción a reportes (Foro)
        this.sub = this.foroService.getPublicaciones().subscribe(pubs => {
            const pendientes = pubs.reduce((total, pub) => {
                const reportadosEnEstaPub = pub.Comentarios?.filter(c => c.reportado).length || 0;
                return total + reportadosEnEstaPub;
            }, 0);

            Promise.resolve().then(() => {
                this.reportesPendientes = pendientes;
                this.cdr.markForCheck();
            });
        });

        // 2. CARGA DE DATOS REALES
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.uid) {
            this.userSub = this.userService.getUserById(currentUser.uid).subscribe(user => {
                if (user) {
                    this.nombreDisplay = user.nombre || 'Usuario Aura';
                    this.correoDisplay = user.correo || '';

                    // Sincroniza inputs solo si el usuario no los está editando activamente
                    if (!this.isSaving && !this.editandoCampos) {
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

        if (!this.nombreEdit || !this.apellidoEdit || !this.nombreEdit.trim() || !this.apellidoEdit.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'No se puede guardar el perfil con el nombre o apellido vacíos.',
                confirmButtonColor: '#5b3a7d',
            });
            return; 
        }

        const nombreAnterior = this.nombreDisplay;
        this.nombreDisplay = this.nombreEdit.trim(); 
        
        this.isSaving = true; 
        this.mensaje = '';
        this.cdr.detectChanges(); 

        this.userService.getUserById(currentUser.uid).pipe(take(1)).subscribe({
            next: (userDoc) => {
                if (userDoc && userDoc.id) {
                    const dataToUpdate = {
                        nombre: this.nombreEdit.trim(),
                        apellido: this.apellidoEdit.trim()
                    };

                    this.userService.updateUser(userDoc.id, dataToUpdate).pipe(take(1)).subscribe({
                        next: () => {
                            const updatedUser = {
                                ...currentUser,
                                nombre: this.nombreEdit.trim(),
                                apellido: this.apellidoEdit.trim(),
                                correo: this.correoEdit,
                            } as User;

                            this.authService.updateCurrentUser(updatedUser);
                            
                            // Cierra el modo edición y vuelve a bloquear los campos
                            this.isSaving = false;
                            this.editandoCampos = false; 
                            this.cdr.detectChanges(); 

                            Swal.fire({
                                icon: 'success',
                                title: 'Perfil actualizado',
                                text: 'Tus datos se guardaron correctamente.',
                                confirmButtonColor: '#5b3a7d',
                            });
                        },
                        error: (err) => {
                            this.nombreDisplay = nombreAnterior;
                            this.isSaving = false;
                            this.cdr.detectChanges(); 

                            Swal.fire({
                                icon: 'error',
                                title: 'No se pudo actualizar',
                                text: err?.message || 'Intenta nuevamente.',
                                confirmButtonColor: '#d33',
                            });
                        }
                    });
                } else {
                    this.isSaving = false;
                    this.nombreDisplay = nombreAnterior;
                    this.cdr.detectChanges();
                }
            },
            error: () => {
                this.isSaving = false;
                this.nombreDisplay = nombreAnterior;
                this.cdr.detectChanges();
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