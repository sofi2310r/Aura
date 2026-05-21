import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  notaForm!: FormGroup;
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

  // Estructura de bindeo para el HTML con ngModel
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
    private fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly notasService: NotasClinicasService,
    private readonly userService: UserService,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.usuarioActual = this.authService.getCurrentUser();
    this.rol = (this.usuarioActual?.rol || this.usuarioActual?.role || '').toString().trim().toLowerCase();
    this.initForm();
    this.cargarPacientes();
    this.cargarNotas().subscribe();
  }

  get puedeCrearNota(): boolean {
    return this.rol === 'psicologo' || this.rol === 'psicólogo';
  }

  puedeEditarNota(nota: NotaClinica): boolean {
    const uidActual = this.usuarioActual?.uid;
    return !!uidActual && (this.rol === 'admin' || nota.psicologoUid === uidActual);
  }

  private initForm(): void {
    // Formulario reactivo invisible encargado de blindar los campos requeridos
    this.notaForm = this.fb.group({
      pacienteUid: ['', Validators.required],
      fecha: ['', Validators.required],
      categoria: ['', Validators.required],
      diagnostico: ['', Validators.required]
    });
  }

  private cargarPacientes(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.pacientes = users.filter((user) =>
          ['paciente', 'usuario'].includes((user.rol || user.role || '').toLowerCase())
        );
        this.cdr.detectChanges();
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
        this.cdr.detectChanges();
      })
    );
  }

  crearNotaClinica(): void {
    if (!this.usuarioActual || this.guardando) return;

    // Sincronizamos los valores actuales de ngModel con el validador estricto
    this.notaForm.patchValue({
      pacienteUid: this.nuevaNota.pacienteUid,
      fecha: this.nuevaNota.fecha,
      categoria: this.nuevaNota.categoria,
      diagnostico: this.nuevaNota.diagnostico
    });

    if (this.notaForm.invalid) {
      Swal.fire('Campos incompletos', 'Por favor, rellene los campos obligatorios (Paciente, Fecha, Categoría y Diagnóstico).', 'warning');
      return;
    }

    const paciente = this.pacientes.find(p => p.uid === this.nuevaNota.pacienteUid);
    if (!paciente) {
      Swal.fire('Error', 'Seleccione un paciente válido', 'error');
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    // Mapeo explícito y seguro para cumplir con el tipo exacto que espera el servicio
    const payload = {
      pacienteUid: paciente.uid,
      pacienteNombre: paciente.nombre || 'Paciente',
      psicologoUid: this.usuarioActual.uid,
      psicologoNombre: this.usuarioActual.nombre || 'Psicólogo',
      fecha: this.nuevaNota.fecha,
      categoria: this.nuevaNota.categoria,
      diagnostico: this.nuevaNota.diagnostico,
      sintomas: this.nuevaNota.sintomas,
      planTratamiento: this.nuevaNota.planTratamiento,
      observaciones: this.nuevaNota.observaciones
    };

    const request$ = this.notaEditando
      ? this.notasService.updateNotaClinica(this.notaEditando.id, payload)
      : this.notasService.createNotaClinica(payload);

    request$.pipe(
      timeout(8000),
      catchError(err => {
        console.error('[Notas Clínicas] Error crítico al guardar:', err);
        Swal.fire('Error de red', 'No se recibió respuesta del servidor. Revisa tu conexión.', 'error');
        return of(null);
      }),
      finalize(() => {
        this.guardando = false;
        this.cdr.detectChanges();
      })
    ).subscribe((res) => {
      if (res !== null) {
        this.mostrarFormulario = false;
        this.resetFormulario();
        this.cdr.detectChanges();

        Swal.fire({ 
          title: '¡Nota Guardada!', 
          text: 'El historial clínico se actualizó correctamente.',
          icon: 'success', 
          timer: 1500, 
          showConfirmButton: false 
        });

        this.cargarNotas().subscribe({
          next: () => this.cdr.detectChanges()
        });
      } else {
        Swal.fire('Error', 'El servidor rechazó la solicitud. Revisa los datos.', 'error');
      }
    });
  }

  eliminarNotaClinica(id: string): void {
    Swal.fire({
      title: '¿Eliminar nota?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.notasService.deleteNotaClinica(id).pipe(
          catchError(err => {
            console.error('Error al eliminar:', err);
            return of(false);
          })
        ).subscribe((res) => {
          if (res !== false) {
            this.cargarNotas().subscribe({
              next: () => this.cdr.detectChanges()
            });
            Swal.fire('Eliminado', 'La nota ha sido borrada.', 'success');
          }
        });
      }
    });
  }

  actualizarFiltro(): void {
    const termino = this.filtroTexto.trim().toLowerCase();
    if (!termino) {
      this.notasFiltradas = [...this.notas];
    } else {
      this.notasFiltradas = this.notas.filter((nota) => {
        const pacienteAsociado = this.pacientes.find(p => p.uid === nota.pacienteUid);
        
        // CORRECCIÓN: Forzamos el tipado a 'as any' de manera segura para saltarnos la restricción estricta de la interfaz
        const pacAny = pacienteAsociado as any;
        const documentoPaciente = String(
          pacAny?.documento || 
          pacAny?.documentoIdentidad || 
          pacAny?.cedula || 
          pacAny?.dni ||
          ''
        ).toLowerCase();

        const nombre = String(nota.pacienteNombre || '').toLowerCase();
        const cat = String(nota.categoria || '').toLowerCase();
        const diag = String(nota.diagnostico || '').toLowerCase();

        return nombre.includes(termino) || 
               documentoPaciente.includes(termino) || 
               cat.includes(termino) || 
               diag.includes(termino);
      });
    }
    this.cdr.detectChanges();
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) this.resetFormulario();
    this.cdr.detectChanges();
  }

  editarNotaClinica(nota: NotaClinica): void {
    this.notaEditando = nota;
    this.mostrarFormulario = true;
    
    this.nuevaNota = { 
      pacienteUid: nota.pacienteUid || '',
      fecha: nota.fecha ? nota.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10),
      categoria: nota.categoria || '',
      diagnostico: nota.diagnostico || '',
      sintomas: nota.sintomas || '',
      planTratamiento: nota.planTratamiento || '',
      observaciones: nota.observaciones || ''
    };
    
    this.cdr.detectChanges();
  }

  abrirModalDetalle(nota: NotaClinica): void {
    this.notaDetalle = nota;
    this.mostrarModalDetalle = true;
    this.cdr.detectChanges();
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle = false;
    this.notaDetalle = null;
    this.cdr.detectChanges();
  }

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