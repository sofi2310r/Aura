import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { NotasClinicasService, NotaClinica } from '../../services/notas-clinicas.service';
import { catchError, finalize, of, timeout } from 'rxjs';

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
  ) {}

  ngOnInit(): void {
    this.usuarioActual = this.authService.getCurrentUser();
    this.rol = (this.usuarioActual?.rol || this.usuarioActual?.role || '').toString().toLowerCase();

    this.cargarPacientes();
    this.cargarNotas();
  }

  private cargarPacientes(): void {
    this.userService.getUsers().subscribe((users) => {
      this.pacientes = users.filter((user) => ['paciente', 'usuario'].includes((user.rol || '').toLowerCase()));
    });
  }

  private cargarNotas(): void {
    if (!this.usuarioActual) {
      this.errorMessage = 'No se encontró el usuario autenticado.';
      return;
    }

    this.cargando = true;
    this.errorMessage = '';

    let notas$;

    if (this.rol === 'psicologo') {
      notas$ = this.notasService.getNotasClinicas({ field: 'psicologoUid', value: this.usuarioActual.uid });
    } else if (this.rol === 'paciente') {
      notas$ = this.notasService.getNotasClinicas({ field: 'pacienteUid', value: this.usuarioActual.uid });
    } else {
      notas$ = this.notasService.getNotasClinicas();
    }

    notas$
      .pipe(
        timeout(15000),
        catchError((error) => {
          console.error('[Notas Clínicas] Error al cargar notas', error);
          this.errorMessage = 'No se pudieron cargar las notas clínicas. Intenta de nuevo más tarde.';
          return of([] as NotaClinica[]);
        }),
        finalize(() => {
          this.cargando = false;
          this.actualizarFiltro();
        }),
      )
      .subscribe({
        next: (notas) => {
          console.log('[Notas Clínicas] notas recibidas:', notas.length, notas);
          this.notas = notas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
          this.notasFiltradas = [...this.notas];
          this.actualizarFiltro();
          this.cargando = false;
        },
      });
  }

  actualizarFiltro(): void {
    const termino = this.filtroTexto.trim().toLowerCase();
    if (!termino) {
      this.notasFiltradas = [...this.notas];
      return;
    }

    this.notasFiltradas = this.notas.filter((nota) => {
      const valores = [
        nota.pacienteNombre || '',
        nota.pacienteUid || '',
        nota.psicologoNombre || '',
        nota.psicologoUid || '',
        nota.categoria || '',
        nota.diagnostico || '',
        nota.sintomas || '',
        nota.planTratamiento || '',
        nota.observaciones || '',
      ];

      return valores.join(' ').toLowerCase().includes(termino);
    });
  }

  get puedeCrearNota(): boolean {
    return this.rol === 'psicologo';
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) {
      this.resetFormulario();
    }
  }

  crearNotaClinica(): void {
    if (!this.usuarioActual || !this.puedeCrearNota) {
      return;
    }

    const paciente = this.pacientes.find((item) => item.uid === this.nuevaNota.pacienteUid);
    if (!paciente) {
      this.errorMessage = 'Selecciona un paciente válido para la nota clínica.';
      return;
    }

    if (!this.nuevaNota.categoria.trim() || !this.nuevaNota.diagnostico.trim()) {
      this.errorMessage = 'La categoría y el diagnóstico son obligatorios.';
      return;
    }

    this.guardando = true;
    this.errorMessage = '';

    const paso = {
      pacienteUid: paciente.uid,
      pacienteNombre: paciente.nombre || paciente.correo || 'Paciente sin nombre',
      psicologoUid: this.usuarioActual.uid,
      psicologoNombre: this.usuarioActual.nombre || this.usuarioActual.correo || 'Psicólogo',
      fecha: this.nuevaNota.fecha,
      categoria: this.nuevaNota.categoria.trim(),
      diagnostico: this.nuevaNota.diagnostico.trim(),
      sintomas: this.nuevaNota.sintomas.trim(),
      planTratamiento: this.nuevaNota.planTratamiento.trim(),
      observaciones: this.nuevaNota.observaciones.trim(),
    };

    const complete = () => {
      this.resetFormulario();
      this.mostrarFormulario = false;
      this.cargarNotas();
    };

    if (this.notaEditando) {
      this.notasService.updateNotaClinica(this.notaEditando.id, paso).subscribe({
        next: () => {
          complete();
        },
        error: (error) => {
          console.error('[Notas Clínicas] Error actualizando la nota clínica', error);
          this.errorMessage = 'No se pudo actualizar la nota clínica. Intenta de nuevo.';
          this.guardando = false;
        },
      });
      return;
    }

    this.notasService.createNotaClinica(paso).subscribe({
      next: () => {
        complete();
      },
      error: (error) => {
        console.error('[Notas Clínicas] Error creando la nota clínica', error);
        this.errorMessage = 'No se pudo guardar la nota clínica. Intenta de nuevo.';
        this.guardando = false;
      },
    });
  }

  editarNotaClinica(nota: NotaClinica): void {
    if (!this.puedeEditarNota(nota)) {
      return;
    }

    this.notaEditando = nota;
    this.mostrarFormulario = true;
    this.errorMessage = '';
    this.nuevaNota = {
      pacienteUid: nota.pacienteUid,
      fecha: nota.fecha ? nota.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10),
      categoria: nota.categoria,
      diagnostico: nota.diagnostico,
      sintomas: nota.sintomas,
      planTratamiento: nota.planTratamiento,
      observaciones: nota.observaciones,
    };
  }

  eliminarNotaClinica(nota: NotaClinica): void {
    if (!this.puedeEliminarNota(nota)) {
      return;
    }

    const confirmado = window.confirm(`¿Eliminar la nota clínica de ${nota.pacienteNombre || 'este paciente'}?`);
    if (!confirmado) {
      return;
    }

    this.notasService.deleteNotaClinica(nota.id).subscribe({
      next: () => {
        this.cargarNotas();
      },
      error: (error) => {
        console.error('[Notas Clínicas] Error eliminando la nota clínica', error);
        this.errorMessage = 'No se pudo eliminar la nota clínica. Intenta de nuevo.';
      },
    });
  }

  puedeEditarNota(nota: NotaClinica): boolean {
    const uid = this.usuarioActual?.uid;
    return !!uid && (
      ['admin', 'administrador', 'moderador'].includes(this.rol) ||
      (this.rol === 'psicologo' && nota.psicologoUid === uid)
    );
  }

  puedeEliminarNota(nota: NotaClinica): boolean {
    return this.puedeEditarNota(nota);
  }

  abrirModalDetalle(nota: NotaClinica): void {
    this.notaDetalle = nota;
    this.mostrarModalDetalle = true;
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.notaDetalle = null;
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
    this.errorMessage = '';
  }

  formatFecha(fecha: string): string {
    const date = new Date(fecha);
    return isNaN(date.getTime()) ? fecha : date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
