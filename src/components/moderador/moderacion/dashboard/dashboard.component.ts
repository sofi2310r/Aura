import { Component } from "@angular/core";
import { OnInit } from "@angular/core";
import { ForoService } from "../../../../services/foro.service";
import { UserService } from "../../../../services/user.service";

@Component({
    selector: 'app-dashboard',
    standalone: false,
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class Dashboard implements OnInit {
    totalUsuarios = 0;
    publicaciones = 0;
    reportes = 0;
    comentariosReportados = 0;

    constructor(
        private foroService: ForoService,
        private userService: UserService
    ) { }

    ngOnInit(): void {

        this.userService.getUsers().subscribe(users => {
            this.totalUsuarios = users.length;
        });

        // 2. Escuchar Foro y Reportes (se actualiza si borras un comentario reportado)
        this.foroService.getPublicaciones().subscribe(pubs => {
            this.publicaciones = pubs.length;

            // Contamos todos los comentarios que tengan la bandera 'reportado: true'
            this.reportes = pubs.reduce((total, pub) => {
                const reportadosEnPub = pub.Comentarios?.filter(c => c.reportado).length || 0;
                return total + reportadosEnPub;
            }, 0);
        });
    }
}