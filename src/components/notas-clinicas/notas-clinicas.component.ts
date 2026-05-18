import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // Importamos ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { NotasClinicasService, NotaClinica } from '../../services/notas-clinicas.service';
import { catchError, finalize, of, timeout, tap } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-notas-clinicas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notas-clinicas.component.html',
  styleUrl: './notas-clinicas.component.css',
})
export class NotasClinicasComponent implements OnInit {
  notas: NotaClinica[] = [];
  notasFiltradas: NotaClinica[] = [];
  pacientes: User[] = [];
  filtroTexto = '';
  cargando = false;
  guardando = false;
  mostrarFormulario = false;
  rol: string = '';
  usuarioActual: User | null = null;
  notaEditando: NotaClinica | null = null;
  mostrarModalDetalle = false;
  notaDetalle: NotaClinica | null = null;

  nuevaNota = {
    pacienteUid: '',
    fecha: new Date().toISOString().slice(0, 10),
    categoria: '',
    diagnostico: '',
    sintomas: '',
    planTratamiento: '',
    observaciones: '',
  };

  constructor(
    private readonly authService: AuthService,
    private readonly notasService: NotasClinicasService,
    private readonly userService: UserService,
    private readonly cdr: ChangeDetectorRef // Inyectamos el detector de cambios
  ) { }

  ngOnInit(): void {
    this.usuarioActual = this.authService.getCurrentUser();
    this.rol = (this.usuarioActual?.rol || this.usuarioActual?.role || '').toString().trim().toLowerCase();
    this.cargarPacientes();
    this.cargarNotas().subscribe();
  }

  // --- GETTERS DE PERMISOS (Faltaban en el TS) ---
  get puedeCrearNota(): boolean {
    return this.rol === 'psicologo' || this.rol === 'psicólogo';
  }

  puedeEditarNota(nota: NotaClinica): boolean {
    const uidActual = this.usuarioActual?.uid;
    return !!uidActual && (this.rol === 'admin' || nota.psicologoUid === uidActual);
  }

  private cargarPacientes(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.pacientes = users.filter((user) =>
          ['paciente', 'usuario'].includes((user.rol || user.role || '').toLowerCase())
        );
        this.cdr.detectChanges(); // Forzar refresco al cargar pacientes
      },
      error: (err) => console.error('[Notas Clínicas] Error cargando pacientes', err)
    });
  }

  cargarNotas() {
    if (!this.usuarioActual) return of([]);
    this.cargando = true;
    const uidActual = this.usuarioActual.uid;

    return this.notasService.getNotasClinicas().pipe(
      timeout(10000),
      tap((todasLasNotas) => {
        let filtradas: NotaClinica[] = [];

        if (this.rol === 'psicologo') {
          filtradas = todasLasNotas.filter(n => n.psicologoUid === uidActual);
        } else if (this.rol === 'paciente') {
          filtradas = todasLasNotas.filter(n => n.pacienteUid === uidActual);
        } else {
          filtradas = todasLasNotas;
        }

        // --- REFUERZO DE REACTIVIDAD ---
        // 1. Limpiamos las referencias actuales
        this.notas = [];
        this.notasFiltradas = [];
        this.cdr.detectChanges();

        // 2. Asignamos los nuevos datos con una nueva referencia de memoria
        this.notas = [...filtradas].sort((a, b) =>
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );

        this.actualizarFiltro();
      }),
      catchError((error) => {
        console.error('[Notas Clínicas] Error al cargar notas', error);
        return of([] as NotaClinica[]);
      }),
      finalize(() => {
        this.cargando = false;
        this.cdr.markForCheck(); // Notifica que la ruta de componentes puede haber cambiado
        this.cdr.detectChanges(); // Forzar a Angular a pintar la lista cargada
      })
    );
  }

  crearNotaClinica(): void {
    if (!this.usuarioActual || this.guardando) return;

    const paciente = this.pacientes.find(p => p.uid === this.nuevaNota.pacienteUid);
    if (!paciente) {
      Swal.fire('Error', 'Seleccione un paciente', 'error');
      return;
    }

    this.guardando = true;
    const payload = {
      ...this.nuevaNota,
      pacienteUid: paciente.uid,
      pacienteNombre: paciente.nombre || 'Paciente',
      psicologoUid: this.usuarioActual.uid,
      psicologoNombre: this.usuarioActual.nombre || 'Psicólogo'
    };

    const request$ = this.notaEditando
      ? this.notasService.updateNotaClinica(this.notaEditando.id, payload)
      : this.notasService.createNotaClinica(payload);

    request$.pipe(
      timeout(8000),
      catchError(err => {
        console.error('Error:', err);
        return of(null);
      }),
      finalize(() => {
        this.guardando = false;
        this.cdr.detectChanges();
      })
    ).subscribe((res) => {
      if (res) {
        this.mostrarFormulario = false;
        this.resetFormulario();

        // RECARGA DIRECTA
        this.cargarNotas().subscribe({
          next: () => {
            // Refuerzo tras la suscripción
            this.cdr.markForCheck();
            this.cdr.detectChanges();
            Swal.fire({ title: '¡Éxito!', icon: 'success', timer: 1000, showConfirmButton: false });
          }
        });
      } else {
        Swal.fire('Error', 'No se pudo guardar', 'error');
      }
    });
  }

  actualizarFiltro(): void {
    const termino = this.filtroTexto.trim().toLowerCase();
    if (!termino) {
      // Usamos el spread operator para asegurar nueva referencia
      this.notasFiltradas = [...this.notas];
    } else {
      this.notasFiltradas = this.notas.filter((nota) =>
        (nota.pacienteNombre + (nota.categoria || '') + (nota.diagnostico || ''))
          .toLowerCase().includes(termino)
      );
    }
    this.cdr.markForCheck();
    this.cdr.detectChanges(); // Forzar refresco tras filtrar
  }

  // --- MÉTODOS ADICIONALES MANTENIDOS ---

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) this.resetFormulario();
    this.cdr.detectChanges();
  }

  editarNotaClinica(nota: NotaClinica): void {
    this.notaEditando = nota;
    this.mostrarFormulario = true;
    this.nuevaNota = { ...nota, fecha: nota.fecha.slice(0, 10) };
    this.cdr.detectChanges();
  }

  eliminarNotaClinica(id: string): void {
    Swal.fire({
      title: '¿Eliminar nota?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.notasService.deleteNotaClinica(id).subscribe(() => {
          this.cargarNotas().subscribe();
          Swal.fire('Eliminado', 'La nota ha sido borrada.', 'success');
        });
      }
    });
  }

  abrirModalDetalle(nota: NotaClinica): void {
    this.notaDetalle = nota;
    this.mostrarModalDetalle = true;
    this.cdr.detectChanges();
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.cdr.detectChanges();
  }

  // --- TRACKBY PARA EL HTML (Faltaba en el TS) ---
  trackByNota(index: number, nota: NotaClinica): string {
    return nota.id;
  }

  private resetFormulario(): void {
    this.notaEditando = null;
    this.nuevaNota = {
      pacienteUid: '',
      fecha: new Date().toISOString().slice(0, 10),
      categoria: '',
      diagnostico: '',
      sintomas: '',
      planTratamiento: '',
      observaciones: '',
    };
    this.cdr.detectChanges();
  }

  formatFecha(f: string): string {
    const d = new Date(f);
    return isNaN(d.getTime()) ? f : d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}