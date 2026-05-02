import { Component, OnInit } from '@angular/core';
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
  errorMessage = '';
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
  ) { }

  ngOnInit(): void {
    this.usuarioActual = this.authService.getCurrentUser();
    this.rol = (this.usuarioActual?.rol || this.usuarioActual?.role || '').toString().trim().toLowerCase();
    console.log('Mi rol detectado es:', this.rol);

    this.cargarPacientes();
    this.cargarNotas().subscribe();
  }

  private cargarPacientes(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.pacientes = users.filter((user) =>
          ['paciente', 'usuario'].includes((user.rol || user.role || '').toLowerCase())
        );
      },
      error: (err) => console.error('[Notas Clínicas] Error cargando pacientes', err)
    });
  }

  /**
   * Carga las notas aplicando un filtro local para garantizar la visualización 
   * de datos independientemente de los índices del servidor.
   */
  cargarNotas() {
    if (!this.usuarioActual) return of([]);

    this.cargando = true;
    const uidActual = this.usuarioActual.uid;
    const rolLimpio = this.rol;

    return this.notasService.getNotasClinicas().pipe(
      timeout(10000),
      tap((todasLasNotas) => {
        console.log('Total notas en BD:', todasLasNotas?.length);
        
        let filtradas: NotaClinica[] = [];

        if (rolLimpio === 'psicologo') {
          // Filtramos localmente para asegurar que no falte nada por errores de consulta
          filtradas = todasLasNotas.filter(n => n.psicologoUid === uidActual);
        } else if (rolLimpio === 'paciente') {
          filtradas = todasLasNotas.filter(n => n.pacienteUid === uidActual);
        } else {
          filtradas = todasLasNotas; // Admin ve todo
        }

        this.notas = [...filtradas].sort((a, b) => 
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        
        this.actualizarFiltro();
      }),
      catchError((error) => {
        console.error('[Notas Clínicas] Error al cargar notas', error);
        return of([] as NotaClinica[]);
      }),
      finalize(() => this.cargando = false)
    );
  }

  crearNotaClinica(): void {
    if (!this.usuarioActual || this.guardando) return;

    if ((this.nuevaNota.diagnostico?.length || 0) > 500) {
      Swal.fire('Error', 'El diagnóstico no puede superar los 500 caracteres.', 'error');
      return;
    }

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
        console.error(err);
        this.guardando = false;
        Swal.fire('Error', 'No se pudo guardar la nota', 'error');
        return of(null);
      })
    ).subscribe((res) => {
      if (res) {
        this.cargarNotas().subscribe(() => {
          this.guardando = false;
          Swal.fire({
            title: '¡Éxito!',
            text: 'Operación realizada correctamente.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            willClose: () => {
              this.mostrarFormulario = false;
              this.resetFormulario();
            }
          });
        });
      } else {
        this.guardando = false;
      }
    });
  }

  actualizarFiltro(): void {
    const termino = this.filtroTexto.trim().toLowerCase();
    if (!termino) {
      this.notasFiltradas = [...this.notas];
      return;
    }
    this.notasFiltradas = this.notas.filter((nota) =>
      (nota.pacienteNombre + (nota.categoria || '') + (nota.diagnostico || ''))
        .toLowerCase().includes(termino)
    );
  }

  get puedeCrearNota(): boolean { return this.rol === 'psicologo'; }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) this.resetFormulario();
  }

  editarNotaClinica(nota: NotaClinica): void {
    if (!this.puedeEditarNota(nota)) return;
    this.notaEditando = nota;
    this.mostrarFormulario = true;
    this.nuevaNota = { ...nota, fecha: nota.fecha.slice(0, 10) };
  }

  eliminarNotaClinica(nota: NotaClinica): void {
    if (!this.puedeEliminarNota(nota)) return;
    
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.notasService.deleteNotaClinica(nota.id).subscribe(() => {
          this.cargarNotas().subscribe();
          Swal.fire('Eliminado', 'La nota ha sido borrada.', 'success');
        });
      }
    });
  }

  puedeEditarNota(nota: NotaClinica): boolean {
    const uid = this.usuarioActual?.uid;
    const esAdmin = ['admin', 'administrador'].includes(this.rol);
    return !!uid && (esAdmin || (this.rol === 'psicologo' && nota.psicologoUid === uid));
  }

  puedeEliminarNota(nota: NotaClinica): boolean { return this.puedeEditarNota(nota); }
  
  abrirModalDetalle(nota: NotaClinica): void { 
    this.notaDetalle = nota; 
    this.mostrarModalDetalle = true; 
  }
  
  cerrarModalDetalle(): void { 
    this.mostrarModalDetalle = false; 
  }

  private resetFormulario(): void {
    this.notaEditando = null;
    this.filtroTexto = ''; 
    this.nuevaNota = {
      pacienteUid: '',
      fecha: new Date().toISOString().slice(0, 10),
      categoria: '',
      diagnostico: '',
      sintomas: '',
      planTratamiento: '',
      observaciones: '',
    };
    this.errorMessage = '';
  }

  formatFecha(f: string): string {
    const d = new Date(f);
    return isNaN(d.getTime()) ? f : d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}