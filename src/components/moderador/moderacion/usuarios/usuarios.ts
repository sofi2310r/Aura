import { Component } from "@angular/core";
import { OnInit } from "@angular/core";
import { UserService } from "../../../../services/user.service";
import Swal from "sweetalert2";

@Component({
    selector: 'app-usuarios',
    standalone: false,
    templateUrl: './usuarios.component.html',
    styleUrl: './usuarios.component.css'
})
export class Usuarios implements OnInit {
    usuarios: any[] = [];

    constructor(private userService: UserService) { }

    ngOnInit(): void {
        this.userService.getUsers().subscribe(users => {
            this.usuarios = users;
        });
    }

    cambiarEstado(usuario: any, nuevoEstado: boolean) {
        if (!usuario.uid) return;

        // 1. BACKUP para rollback si falla el servidor
        const usuariosOriginales = [...this.usuarios];

        // 2. ACTUALIZACIÓN OPTIMISTA: Cambiamos el estado en la interfaz YA
        this.usuarios = this.usuarios.map(u =>
            u.uid === usuario.uid ? { ...u, activo: nuevoEstado, reporte: nuevoEstado ? 0 : u.reporte } : u
        );

        const actualizado = {
            ...usuario,
            activo: nuevoEstado,
            reporte: nuevoEstado ? 0 : (usuario.reporte || 0)
        };

        this.userService.updateUser(actualizado).subscribe({
            next: () => {
                // Toast pequeño para confirmar sin estorbar
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                });
                Toast.fire({
                    icon: 'success',
                    title: nuevoEstado ? 'Usuario activado' : 'Usuario bloqueado'
                });
            },
            error: (err) => {
                // 3. ROLLBACK: Si el servidor falla, regresamos a como estaba
                this.usuarios = usuariosOriginales;
                Swal.fire('Error', 'No se pudo actualizar el usuario', 'error');
            }
        });
    }

    // Funciones de conveniencia que llaman a la principal
    bloquear(usuario: any) {
        this.cambiarEstado(usuario, false);
    }

    desbloquear(usuario: any) {
        this.cambiarEstado(usuario, true);
    }
}