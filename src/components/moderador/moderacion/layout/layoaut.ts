import { Component, OnInit, OnDestroy } from "@angular/core";
import { ForoService } from "../../../../services/foro.service";
import { Router } from "@angular/router";
import { AuthService } from "../../../../services/auth.service";
import { Subscription } from "rxjs";

@Component({
    selector: 'app-layout',
    standalone: false,
    templateUrl: './layout.component.html',
    styleUrl: './layoaut.component.css'
})
export class Layout implements OnInit, OnDestroy {
    reportesPendientes = 0;
    private sub: Subscription | null = null;

    constructor(
        private foroService: ForoService,
        private authService: AuthService,
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
    }

    ngOnDestroy(): void {
        if (this.sub) {
            this.sub.unsubscribe();
        }
    }
}