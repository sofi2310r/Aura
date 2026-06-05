import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription, interval } from 'rxjs';
import { filter, startWith } from 'rxjs/operators';
import { User, UserRole } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { NavbarAdminComponent } from '../../shared/navbar-admin/navbar-admin.component';
import { FooterAdminComponent } from '../../shared/footer-admin/footer-admin.component';
import { ForoService } from '../../../services/foro.service';

// Declaramos bootstrap globalmente para interactuar con sus modales por código
declare var bootstrap: any;

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarAdminComponent, FooterAdminComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  readonly users$: Observable<User[]>;
  readonly roles: UserRole[] = ['admin', 'psicologo', 'moderador', 'paciente', 'administrador'];

  adminUser: User | null = null;
  nombre = '';
  apellido = '';
  correo = '';
  rol: UserRole = 'paciente';
  mensaje = '';
  errorMessage = '';
  isAdminHomeRoute = true;

  // Dashboard friendly
  saludo = 'Bienvenido';
  fechaActual = new Date();
  fechaActualTexto = '';

  // Variables para la edición en Configuración
  nuevaClave = '';

  // Estadísticas
  totalUsuarios = 0;
  psicologosActivos = 0;
  moderadores = 0;
  pacientesActivos = 0;
  totalPublicaciones = 0;

  private subscriptions = new Subscription();

  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
    public readonly router: Router,
    private readonly foroService: ForoService,
    private readonly cdr: ChangeDetectorRef,
    private readonly zone: NgZone // <-- INYECTAMOS NGZONE PARA CONTROLAR EL FLUJO VISUAL
  ) {
    this.users$ = this.userService.getUsers();
  }

  ngOnInit(): void {
    this.userService.refresh();

    this.fechaActualTexto = this.fechaActual.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    this.saludo = this.obtenerSaludo();

    // Carga de Publicaciones
    this.subscriptions.add(
      this.foroService.getPublicaciones().subscribe(pubs => {
        this.totalPublicaciones = pubs.length;
        this.cdr.detectChanges(); 
      })
    );

    // Carga de Estadísticas de Usuarios
    this.subscriptions.add(
      this.users$.subscribe(users => {
        this.cargarEstadisticas(users);
        this.cdr.detectChanges(); 
      })
    );

    this.cargarAdminActual();

    // Lógica de detección de ruta
    this.subscriptions.add(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd),
        startWith(new NavigationEnd(0, this.router.url, this.router.url))
      ).subscribe((event: any) => {
        this.updateRouteState(event.urlAfterRedirects || event.url);
      })
    );

    // Auto-refresh cada 30 segundos
    this.subscriptions.add(
      interval(30000).subscribe(() => this.userService.refresh())
    );
  }

  private updateRouteState(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    this.isAdminHomeRoute = cleanUrl === '/admin' || cleanUrl === '/admin/';
    this.cdr.detectChanges(); 
  }

  cargarAdminActual(): void {
    const usuarioActual = this.authService.getCurrentUser();
    if (!usuarioActual) {
      this.errorMessage = 'No hay sesión iniciada.';
      this.cdr.detectChanges();
      return;
    }
    this.adminUser = usuarioActual;

    this.subscriptions.add(
      this.userService.getUserById(usuarioActual.uid).subscribe(user => {
        if (user) {
          this.adminUser = user;
          this.nombre = user.nombre;
          this.apellido = user.apellido;
          this.correo = user.correo;
          this.cdr.detectChanges(); 
        }
      })
    );
  }

  guardarCambiosPerfil(): void {
    if (!this.adminUser) return;

    if (!this.nombre.trim() || !this.apellido.trim()) {
      this.errorMessage = 'El nombre y el apellido son obligatorios.';
      this.mensaje = '';
      this.cdr.detectChanges();
      return;
    }

    const usuarioActualizado: User = {
      ...this.adminUser,
      nombre: this.nombre.trim(),
      apellido: this.apellido.trim()
    };

    this.subscriptions.add(
      this.userService.updateUser(usuarioActualizado).subscribe({
        next: (user) => {
          this.adminUser = user;
          this.nombre = user.nombre;
          this.apellido = user.apellido;
          this.errorMessage = '';
          this.mensaje = 'Perfil actualizado correctamente.';
          this.cdr.detectChanges();

          this.authService.updateCurrentUser(user);

          Swal.fire({
            icon: 'success',
            title: 'Perfil actualizado',
            text: 'Tus datos se guardaron correctamente.',
            confirmButtonColor: '#5b3a7d',
          });
        },
        error: (err) => {
          this.errorMessage = 'Error al actualizar: ' + err.message;
          this.mensaje = '';
          this.cdr.detectChanges();

          Swal.fire({
            icon: 'error',
            title: 'No se pudo actualizar',
            text: this.errorMessage,
            confirmButtonColor: '#d33',
          });
        }
      })
    );
  }

  /**
   * SOLUCIÓN POR CONTRATO (ZONA DE INTERRUPCIÓN): Forzamos a que Angular ejecute el cierre
   * dentro de su propio hilo principal reactivo de inmediato.
   */
  eliminarUsuario(id: string): void {
    if (!id) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El usuario seleccionado no tiene un ID válido.',
        confirmButtonColor: '#5b3a7d'
      });
      return;
    }

    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará al usuario permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        
        Swal.showLoading();

        this.subscriptions.add(
          this.userService.removeUser(id).subscribe({
            next: () => {
              // FORZAMOS A ANGULAR A VOLVER A ENTRAR EN SU ZONA DE CAMBIOS
              this.zone.run(() => {
                
                // 1. Buscamos y presionamos físicamente todos los botones de escape de las modales vivas
                const botonesDeCierre = document.querySelectorAll('.modal.show [data-bs-dismiss="modal"]');
                botonesDeCierre.forEach((boton: any) => boton.click());

                // 2. Destruimos las instancias oficiales del árbol del DOM por si el click falló
                const allModals = document.querySelectorAll('.modal');
                allModals.forEach((modalElement) => {
                  try {
                    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
                    if (modalInstance) {
                      modalInstance.hide();
                    }
                  } catch (e) {
                    modalElement.classList.remove('show');
                    modalElement.setAttribute('aria-hidden', 'true');
                    (modalElement as HTMLElement).style.display = 'none';
                  }
                });

                // 3. Limpiamos las cortinas grises de Bootstrap con micro-retardo reactivo
                setTimeout(() => {
                  const backdrops = document.querySelectorAll('.modal-backdrop');
                  backdrops.forEach(backdrop => backdrop.remove());
                  
                  document.body.classList.remove('modal-open');
                  document.body.style.removeProperty('padding-right');
                  document.body.style.overflow = 'auto';

                  // Solicitamos datos nuevos al servicio y repintamos de inmediato la tabla
                  this.userService.refresh();
                  this.cdr.detectChanges();
                }, 100);

                // 4. Cerramos SweetAlert y lanzamos el éxito directo sin clics fantasmas en pantalla
                Swal.close();
                Swal.fire({
                  icon: 'success',
                  title: 'Eliminado',
                  text: 'El usuario ha sido eliminado correctamente.',
                  confirmButtonColor: '#5b3a7d'
                });
              });
            },
            error: (err) => {
              this.zone.run(() => {
                Swal.close();
                Swal.fire({
                  icon: 'error',
                  title: 'Error al eliminar',
                  text: err.message || 'No se pudo completar la acción.',
                  confirmButtonColor: '#5b3a7d'
                });
              });
            }
          })
        );
      }
    });
  }

  cargarEstadisticas(users: User[]): void {
    if (!users) return;
    this.totalUsuarios = users.length;
    this.psicologosActivos = users.filter(u => u.rol === 'psicologo' && u.activo).length;
    this.moderadores = users.filter(u => u.rol === 'moderador').length;
    this.pacientesActivos = users.filter(u => u.rol === 'paciente' && u.activo).length;
  }

  private obtenerSaludo(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}