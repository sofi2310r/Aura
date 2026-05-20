import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { ForoService } from '../../../../services/foro.service';
import { UserService } from '../../../../services/user.service';
import { AuthService } from '../../../../services/auth.service';
import { User } from '../../../../models/user.model';
import { Subscription, interval } from 'rxjs';
import { filter, startWith } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  standalone: false, // Componente basado en módulo clásico
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class Dashboard implements OnInit, OnDestroy {

  // Métricas del Moderador (Solo Visualización)
  totalUsuarios = 0;
  publicaciones = 0;
  reportes = 0;

  // Lógica de Navegación Interna
  isConfigRoute = false;
  isModeradorHomeRoute = true;

  // Datos del Moderador (Lectura)
  moderadorUser: User | null = null;
  nombre = '';
  apellido = '';
  correo = '';
  
  // Seguridad (Única acción permitida)
  nuevaClave = '';
  errorMessage = '';

  // Elementos visuales de la interfaz
  saludo = 'Bienvenido';
  fechaActual = new Date();
  fechaActualTexto = '';

  private subscriptions = new Subscription();

  constructor(
    private readonly foroService: ForoService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    public readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Forzamos actualización del listado global para las métricas
    this.userService.refresh();

    // Formateo de fecha para el banner de bienvenida
    this.fechaActualTexto = this.fechaActual.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    this.saludo = this.obtenerSaludo();
    
    // Carga de hilos de datos reactivos
    this.cargarEstadisticas();
    this.cargarDatosModerador();

    // Detección automática de sub-rutas si las hay
    this.subscriptions.add(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd),
        startWith(new NavigationEnd(0, this.router.url, this.router.url))
      ).subscribe((event: any) => {
        this.updateRouteState(event.urlAfterRedirects || event.url);
      })
    );

    // Auto-refresh automático cada 30 segundos para actualizar reportes en tiempo real
    this.subscriptions.add(
      interval(30000).subscribe(() => this.userService.refresh())
    );
  }

  private updateRouteState(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    this.isModeradorHomeRoute = cleanUrl === '/moderador' || cleanUrl === '/moderador/';
    this.cdr.detectChanges();
  }

  private cargarEstadisticas(): void {
    // 1. Contador de Usuarios Registrados en el Sistema
    this.subscriptions.add(
      this.userService.getUsers().subscribe(users => {
        if (users) {
          this.totalUsuarios = users.length;
          this.cdr.detectChanges();
        }
      })
    );

    // 2. Contador de publicaciones del foro y extracción de comentarios marcados como reportados
    this.subscriptions.add(
      this.foroService.getPublicaciones().subscribe(pubs => {
        if (pubs) {
          this.publicaciones = pubs.length;
          this.reportes = pubs.reduce((total, pub) => {
            const reportadosEnPub = pub.Comentarios?.filter(c => c.reportado).length || 0;
            return total + reportadosEnPub;
          }, 0);
          this.cdr.detectChanges();
        }
      })
    );
  }

  cargarDatosModerador(): void {
    const usuarioActual = this.authService.getCurrentUser();
    if (!usuarioActual) {
      this.errorMessage = 'No hay sesión iniciada.';
      this.cdr.detectChanges();
      return;
    }

    // Cargamos los datos del moderador en modo de solo lectura
    this.subscriptions.add(
      this.userService.getUserById(usuarioActual.uid).subscribe(user => {
        if (user) {
          this.moderadorUser = user;
          this.nombre = user.nombre || '';
          this.apellido = user.apellido || '';
          this.correo = user.correo || '';
          this.cdr.detectChanges();
        }
      })
    );
  }

  // --- NAVEGACIÓN DE PANELES EN EL DASHBOARD ---
  activarConfiguracion(): void {
    this.isConfigRoute = true;
    this.cdr.detectChanges();
  }

  activarInicio(): void {
    this.isConfigRoute = false;
    this.cdr.detectChanges();
  }

  // --- SEGURIDAD Y CREDENCIALES (Única acción de cambio permitida) ---
  actualizarPassword(): void {
    if (this.nuevaClave.length < 6) {
      Swal.fire({
        icon: 'warning',
        title: 'Clave insegura',
        text: 'La clave debe tener al menos 6 caracteres.',
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    this.authService.updatePassword(this.nuevaClave)
      .then(() => {
        this.nuevaClave = '';
        this.errorMessage = '';
        this.cdr.detectChanges();

        Swal.fire({
          icon: 'success',
          title: 'Seguridad actualizada',
          text: 'Tu contraseña ha sido cambiada con éxito.',
          confirmButtonColor: '#2563eb'
        });
      })
      .catch(err => {
        this.errorMessage = 'Error: ' + err.message;
        this.cdr.detectChanges();

        Swal.fire({
          icon: 'error',
          title: 'Error de autenticación',
          text: this.errorMessage,
          confirmButtonColor: '#ef4444'
        });
      });
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
    // Limpieza imperativa de suscripciones para evitar fugas de memoria
    this.subscriptions.unsubscribe();
  }
}