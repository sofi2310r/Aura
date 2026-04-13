import { Component, OnInit, OnDestroy } from "@angular/core";
import { ForoService } from "../../../../services/foro.service";
import { Router } from "@angular/router";
import { AuthService } from "../../../../services/auth.service";
import { UserService } from "../../../../services/user.service";
import { Subscription } from "rxjs";
import Swal from "sweetalert2";

@Component({
    selector: 'app-layout',
    standalone: false,
    templateUrl: './layout.component.html',
    styleUrl: './layoaut.component.css'
})
export class Layout implements OnInit, OnDestroy {
    reportesPendientes = 0;
    private sub: Subscription | null = null;
    private userSub: Subscription | null = null;

    constructor(
        private foroService: ForoService,
        private authService: AuthService,
        private userService: UserService,
        private router: Router
    ) { }

    logout() {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
    ngOnInit(): void {
        // Nos suscribimos al flujo de publicaciones
        this.sub = this.foroService.getPublicaciones().subscribe(pubs => {

            // Calculamos el total de comentarios reportados de forma segura
            this.reportesPendientes = pubs.reduce((total, pub) => {
                // El ?. asegura que si no hay comentarios, no explote el código
                const reportadosEnEstaPub = pub.comentarios?.filter(c => c.reportado).length || 0;
                return total + reportadosEnEstaPub;
            }, 0);

        });

        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.uid) {
            this.userSub = this.userService.getUserById(currentUser.uid).subscribe(user => {
                if (user && user.activo === false) {
                    this.expulsarUsuario(user);
                }
            });
        }
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
            setTimeout(() => location.reload(), 100);
        })
    }
    ngOnDestroy(): void {
        if (this.sub) {
            this.sub.unsubscribe();
        }
    }
}