import { Component, DestroyRef, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ForoService, Publicacion } from '../../../services/foro.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';
import { NotificacionService } from '../../../services/notificacion.service';
import { UserService } from '../../../services/user.service';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-foro',
  standalone: false,
  templateUrl: './foro.component.html',
  styleUrl: './foro.component.css',
})
export class ForoComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  publicaciones: Publicacion[] = [];
  vistaDetalle: Publicacion | null = null;
  mostrarFormulario = false;
  titulo = '';
  contenido = '';
  publicando = false;
  nuevoComentario = '';
  nuevaRespuesta: { [key: number]: string } = {};
  enviando = false;
  mensaje = '';
  mostrarNavbarAdmin = false;
  mostrarNavegacionPublica = true;
  rutaSalida = '/home';
  private isDestroyed = false;
  private autoRefreshSub?: Subscription;

  // Filtrado y Búsqueda de Comunidad
  terminoBusqueda = '';
  categoriaSeleccionada = 'Todas';
  readonly categorias = ['Todas', 'Ansiedad', 'Autoestima', 'Desahogo', 'Mindfulness', 'Consejos'];

  constructor(
    private readonly foroService: ForoService,
    private readonly cdr: ChangeDetectorRef,
    private readonly authService: AuthService,
    private readonly router: Router,
    private notificacionService: NotificacionService,
    private userService: UserService
  ) {
    this.aplicarContextoNavegacion();
    this.vistaDetalle = null;
    this.cargarPublicaciones();

    this.autoRefreshSub = interval(8000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => this.foroService.getPublicaciones())
      )
      .subscribe({
        next: (publicaciones) => {
          if (publicaciones) {
            this.actualizarListadoLocal(publicaciones);
          }
        },
        error: (err) => console.error('Error en autorefresco:', err)
      });
  }

  private cargarPublicaciones(): void {
    this.foroService
      .getPublicaciones()
      .subscribe({
        next: (publicaciones) => {
          console.log('--- DATOS DEL SERVIDOR RECIBIDOS ---', publicaciones);
          if (publicaciones) {
            this.actualizarListadoLocal(publicaciones);
          }
        },
        error: (err) => {
          console.error('Error crítico al descargar posts', err);
          this.safeDetectChanges();
        }
      });
  }

  private actualizarListadoLocal(publicaciones: Publicacion[]): void {
    console.log('Sincronizando listado local. ¿Es Array?:', Array.isArray(publicaciones), 'Tamaño:', publicaciones?.length);

    if (!Array.isArray(publicaciones)) {
      console.warn('¡Atención! Las publicaciones no llegaron como un Array válido.');
      return;
    }

    this.publicaciones = [...publicaciones];

    if (this.vistaDetalle) {
      const actualizada = publicaciones.find((pub) => pub.id === this.vistaDetalle?.id);
      if (actualizada) {
        this.vistaDetalle = { ...actualizada };
      }
    }

    this.safeDetectChanges();
  }

  inyectarPostFalso(): void {
    console.log('Inyectando post falso de diagnóstico...');
    this.publicaciones = [
      {
        id: 'bypass-test',
        titulo: 'Post de Diagnóstico de Aura',
        contenido: 'Si puedes ver esta tarjeta morada, tu HTML, tus directivas y tus estilos CSS están al 100%. El problema está estrictamente en la respuesta vacía de tu base de datos Firebase.',
        fecha: new Date(),
        autor: 'Psicólogo de Prueba',
        autorUid: 'mock-123',
        rol: 'psicologo',
        Comentarios: []
      }
    ];
    this.safeDetectChanges();
  }

  getNombre(): string { return this.authService.getCurrentUser()?.nombre || 'Usuario'; }
  getCorreo(): string { return this.authService.getCurrentUser()?.correo || 'usuario@aura.com'; }
  getRol(): string {
    const user = this.authService.getCurrentUser();
    return (user?.rol || user?.role || '').toString().toLowerCase().trim();
  }

  private aplicarContextoNavegacion(): void {
    const rol = this.getRol();
    const esRutaAdmin = this.router.url.startsWith('/admin');
    const esRutaPsicologo = this.router.url.startsWith('/psicologo');
    const esRutaModerador = this.router.url.startsWith('/moderador');

    this.mostrarNavbarAdmin = !esRutaAdmin && (rol === 'admin' || rol === 'administrador');
    this.mostrarNavegacionPublica = !(this.mostrarNavbarAdmin || esRutaPsicologo || esRutaModerador || esRutaAdmin || rol === 'psicologo' || rol === 'moderador');

    if (esRutaAdmin || rol === 'admin' || rol === 'administrador') { this.rutaSalida = '/admin'; return; }
    if (rol === 'psicologo') { this.rutaSalida = '/psicologo'; return; }
    if (rol === 'moderador') { this.rutaSalida = '/moderador'; return; }
    this.rutaSalida = '/home';
  }

  tienePermisosModerador(): boolean { return ['admin', 'administrador', 'moderador', 'psicologo'].includes(this.getRol()); }
  puedeCrearPublicacion(): boolean { return ['admin', 'administrador', 'psicologo'].includes(this.getRol()); }
  puedeEditar(): boolean { return ['admin', 'administrador', 'psicologo'].includes(this.getRol()); }

  eliminarPublicacion(event: Event, pub: Publicacion): void {
    event.stopPropagation();
    if (!this.tienePermisosModerador()) return;

    Swal.fire({
      title: '¿Eliminar publicación?',
      text: `¿Estás seguro de eliminar "${pub.titulo}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Sí, eliminar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.foroService.eliminarPublicacion(pub.id).subscribe({
          next: () => {
            if (this.vistaDetalle?.id === pub.id) this.vistaDetalle = null;
            this.cargarPublicaciones();
          }
        });
      }
    });
  }

  async editarPublicacion(event: Event, pub: Publicacion): Promise<void> {
    event.stopPropagation();
    if (!this.puedeEditar()) return;

    const { value: formValues } = await Swal.fire({
      title: 'Editar Publicación',
      html:
        `<input id="sw-titulo" class="swal2-input" value="${pub.titulo}">` +
        `<textarea id="sw-contenido" class="swal2-textarea" style="height:150px">${pub.contenido}</textarea>`,
      showCancelButton: true,
      preConfirm: () => {
        const t = (document.getElementById('sw-titulo') as HTMLInputElement).value;
        const c = (document.getElementById('sw-contenido') as HTMLTextAreaElement).value;
        return [t, c];
      }
    });

    if (formValues) {
      this.foroService.actualizarPublicacion(pub.id, { titulo: formValues[0], contenido: formValues[1] }).subscribe({
        next: (pubActualizada) => {
          // Actualización reactiva instantánea sin recarga de pantalla
          if (this.vistaDetalle?.id === pubActualizada.id) {
            this.vistaDetalle = { ...pubActualizada };
          }

          const listaModificada = this.publicaciones.map((p) =>
            p.id === pubActualizada.id ? pubActualizada : p
          );

          this.publicaciones = [...listaModificada];
          this.safeDetectChanges();
        },
        error: (err) => {
          console.error('Error al intentar editar la publicación:', err);
          Swal.fire('Error', 'No se pudieron guardar los cambios', 'error');
        }
      });
    }
  }

  toggleFormulario(): void { this.mostrarFormulario = !this.mostrarFormulario; }

  publicar(): void {
    if (!this.puedeCrearPublicacion() || !this.titulo.trim() || !this.contenido.trim()) return;
    this.publicando = true;
    const tBackup = this.titulo; const cBackup = this.contenido;
    this.titulo = ''; this.contenido = ''; this.mostrarFormulario = false;

    this.foroService.crearPublicacion({ titulo: tBackup, contenido: cBackup, autor: this.getNombre(), autorUid: this.authService.getCurrentUser()?.uid || '', rol: this.getRol() }).subscribe({
      next: () => { this.publicando = false; this.cargarPublicaciones(); },
      error: () => { this.publicando = false; this.mostrarFormulario = true; }
    });
  }

  abrirDetalle(pub: Publicacion): void { this.vistaDetalle = { ...pub }; this.safeDetectChanges(); }
  volverLista(): void { this.vistaDetalle = null; this.nuevoComentario = ''; this.safeDetectChanges(); }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.autoRefreshSub) this.autoRefreshSub.unsubscribe();
  }

  private safeDetectChanges(): void {
    if (this.isDestroyed) return;
    setTimeout(() => {
      try { this.cdr.detectChanges(); } catch { try { this.cdr.markForCheck(); } catch { } }
    }, 0);
  }

  responder(): void {
    if (this.getRol() === 'moderador' || !this.vistaDetalle || !this.nuevoComentario.trim()) return;
    this.enviando = true; const text = this.nuevoComentario; this.nuevoComentario = '';
    this.foroService.agregarComentario(this.vistaDetalle.id, { texto: text, autor: this.getNombre(), autorUid: this.authService.getCurrentUser()?.uid || '', publicacionAutorUid: (this.vistaDetalle as any).autorUid || '', rol: this.getRol(), fecha: new Date(), reportado: false }).subscribe({
      next: (pubUp) => {
        this.vistaDetalle = { ...pubUp };
        this.publicaciones = this.publicaciones.map((p) => p.id === pubUp.id ? pubUp : p);
        this.enviando = false;
        this.safeDetectChanges();
      }
    });
  }

  reportar(index: number): void {
    if (!this.vistaDetalle) return;
    this.foroService.reportarComentario(this.vistaDetalle!.id, index).subscribe({
      next: (p) => {
        this.vistaDetalle = { ...p };
        this.publicaciones = this.publicaciones.map((pub) => pub.id === p.id ? p : pub);
        this.safeDetectChanges();
      }
    });
  }

  responderComentario(index: number): void {
    if (this.getRol() === 'moderador' || !this.vistaDetalle || !this.nuevaRespuesta[index]?.trim()) return;
    this.enviando = true; const txt = this.nuevaRespuesta[index]; this.nuevaRespuesta[index] = '';
    this.foroService.agregarRespuesta(this.vistaDetalle.id, index, { texto: txt, autor: this.getNombre() }).subscribe({
      next: (p) => { this.vistaDetalle = { ...p }; this.enviando = false; this.safeDetectChanges(); }
    });
  }

  formatFecha(fecha: any): string {
    if (!fecha) return '';
    const d = fecha.seconds ? new Date(fecha.seconds * 1000) : new Date(fecha);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  isLoggedIn(): boolean {
    return !!this.authService.getCurrentUser();
  }

  filtrarCategoria(cat: string): void {
    this.categoriaSeleccionada = cat;
  }

  getPublicacionesFiltradas(): Publicacion[] {
    let filtradas = this.publicaciones;

    if (this.terminoBusqueda && this.terminoBusqueda.trim() !== '') {
      const query = this.terminoBusqueda.toLowerCase().trim();
      filtradas = filtradas.filter(
        (pub) =>
          (pub.titulo || '').toLowerCase().includes(query) ||
          (pub.contenido || '').toLowerCase().includes(query)
      );
    }

    if (this.categoriaSeleccionada !== 'Todas') {
      const cat = this.categoriaSeleccionada.toLowerCase();
      filtradas = filtradas.filter((pub) => {
        const text = ((pub.titulo || '') + ' ' + (pub.contenido || '')).toLowerCase();

        if (cat === 'ansiedad') {
          return text.includes('ansiedad') || text.includes('estrés') || text.includes('pánico') || text.includes('panico') || text.includes('nervios') || text.includes('crisis');
        }
        if (cat === 'autoestima') {
          return text.includes('autoestima') || text.includes('amor propio') || text.includes('espejo') || text.includes('valor') || text.includes('insegura') || text.includes('seguridad');
        }
        if (cat === 'desahogo') {
          return text.includes('desahogo') || text.includes('triste') || text.includes('llorar') || text.includes('sola') || text.includes('dolor') || text.includes('mal');
        }
        if (cat === 'mindfulness') {
          return text.includes('mindfulness') || text.includes('medita') || text.includes('respirar') || text.includes('respira') || text.includes('paz') || text.includes('calma') || text.includes('atención plena');
        }
        if (cat === 'consejos') {
          return text.includes('consejo') || text.includes('recomiend') || text.includes('ayuda') || text.includes('tip') || text.includes('sugerencia');
        }
        return true;
      });
    }

    return filtradas;
  }

  get conteoCaracteres(): number { return this.contenido ? this.contenido.length : 0; }
  get conteoTitulo(): number { return this.titulo ? this.titulo.length : 0; }
}