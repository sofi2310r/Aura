import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError, firstValueFrom } from 'rxjs';
import { BackendService, extractBackendErrorMessage } from './backend.service';

export interface Cita {
  id: string;
  paciente: string;
  psicologo: string;
  fecha: string;
  motivo: string;
  estado: 'pendiente' | 'confirmada';
}

interface FirestoreCitaDocument {
  id: string;
  paciente?: unknown;
  psicologo?: unknown;
  fecha?: unknown;
  motivo?: unknown;
  estado?: unknown;
}

interface FirestoreCreateResponse {
  id: string;
}

@Injectable({
  providedIn: 'root',
})
export class CitaService {
  private readonly citasSubject = new BehaviorSubject<Cita[]>([]);
  private readonly citasUrl = '/api/firestore/Citas';

  constructor(private readonly backend: BackendService) {
    this.refreshCitas();
  }

  getCitas(): Observable<Cita[]> {
    return this.citasSubject.asObservable();
  }

  validarDisponibilidad(fecha: string, psicologo: string): boolean {
    // 1. Convertimos la fecha de entrada a milisegundos (limpiando segundos y milisegundos si es necesario)
    const fechaBusqueda = new Date(fecha);
    fechaBusqueda.setSeconds(0, 0); // Nos aseguramos de comparar solo hasta el minuto
    const tiempoBusqueda = fechaBusqueda.getTime();

    // 2. Normalizamos el nombre del psicólogo para la comparación
    const psicologoNormalizado = psicologo.trim().toLowerCase();

    return this.citasSubject.value.some(cita => {
      // 3. Convertimos la fecha de la cita existente
      const fechaExistente = new Date(cita.fecha);
      fechaExistente.setSeconds(0, 0);

      // 4. Comparamos tiempo exacto y psicólogo
      return (
        fechaExistente.getTime() === tiempoBusqueda &&
        cita.psicologo.trim().toLowerCase() === psicologoNormalizado
      );
    });
  }

  addCita(cita: Omit<Cita, 'id' | 'estado'> & Partial<Pick<Cita, 'estado'>>): Observable<Cita> {
    // 1. Creamos el objeto base con los datos limpios
    const newCitaBase: Omit<Cita, 'id'> = {
      paciente: cita.paciente.trim(),
      psicologo: cita.psicologo.trim(),
      fecha: cita.fecha,
      motivo: cita.motivo.trim(),
      estado: cita.estado ?? 'pendiente',
    };

    // 2. Realizamos el POST al backend
    return this.backend.post<FirestoreCreateResponse>(this.citasUrl, newCitaBase).pipe(
      map((response) => ({
        ...newCitaBase,
        id: response.id // Asignamos el ID real que devuelve Firestore
      })),
      tap((createdCita) => {
        // 3. ACTUALIZACIÓN DE LA FUENTE DE VERDAD:
        // Usamos una función para asegurar que no metamos duplicados por accidente
        const currentCitas = this.citasSubject.value;

        // Si la cita ya existe (por el ID real), no la agregamos otra vez
        const existe = currentCitas.some(c => c.id === createdCita.id);

        if (!existe) {
          // Agregamos la nueva y ordenamos
          const nuevaLista = this.sortCitas([...currentCitas, createdCita]);
          this.citasSubject.next(nuevaLista);
        }
      }),
      catchError((error: unknown) => {
        const mensaje = extractBackendErrorMessage(error, 'No se pudo guardar la cita.');
        return throwError(() => new Error(mensaje));
      })
    );
  }

  removeCita(id: string): Observable<void> {
    return this.backend.delete<{ deleted: boolean }>(`${this.citasUrl}/${encodeURIComponent(id)}`).pipe(
      tap(() => {
        this.citasSubject.next(this.citasSubject.value.filter((cita) => cita.id !== id));
      }),
      map(() => undefined),
      catchError((error: unknown) =>
        throwError(() => new Error(extractBackendErrorMessage(error, 'No se pudo eliminar la cita.'))),
      ),
    );
  }

  private refreshCitas(): void {
    this.backend
      .get<FirestoreCitaDocument[]>(this.citasUrl)
      .pipe(
        map((documents) => this.sortCitas(documents.map((document) => this.mapCita(document)))),
        catchError(() => of([])),
      )
      .subscribe((citas) => {
        this.citasSubject.next(citas);
      });
  }

  private mapCita(document: FirestoreCitaDocument): Cita {
    return {
      id: document.id,
      paciente: typeof document.paciente === 'string' && document.paciente.trim() ? document.paciente.trim() : 'Paciente',
      psicologo:
        typeof document.psicologo === 'string' && document.psicologo.trim() ? document.psicologo.trim() : 'Psicologo',
      fecha: typeof document.fecha === 'string' && document.fecha.trim() ? document.fecha.trim() : new Date().toISOString(),
      motivo: typeof document.motivo === 'string' && document.motivo.trim() ? document.motivo.trim() : 'Sin motivo',
      estado: document.estado === 'confirmada' ? 'confirmada' : 'pendiente',
    };
  }

  private toPayload(cita: Cita): Omit<Cita, 'id'> {
    return {
      paciente: cita.paciente,
      psicologo: cita.psicologo,
      fecha: cita.fecha,
      motivo: cita.motivo,
      estado: cita.estado,
    };
  }

  private sortCitas(citas: Cita[]): Cita[] {
    return [...citas].sort((left, right) => new Date(left.fecha).getTime() - new Date(right.fecha).getTime());
  }

  updateCita(id: string, data: any): Observable<any> {
    // USAR LA MISMA URL: this.citasUrl
    return this.backend.patch(`${this.citasUrl}/${encodeURIComponent(id)}`, data).pipe(
      tap(() => {
        // Actualizamos el BehaviorSubject para que el resto de la app sepa del cambio
        const listaActualizada = this.citasSubject.value.map(c =>
          c.id === id ? { ...c, ...data } : c
        );
        this.citasSubject.next(listaActualizada);
      }),
      catchError(error => {
        return throwError(() => new Error('Error al conectar con el servidor'));
      })
    );
  }
}