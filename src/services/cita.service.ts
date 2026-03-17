import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
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

  addCita(cita: Omit<Cita, 'id' | 'estado'> & Partial<Pick<Cita, 'estado'>>): Observable<Cita> {
    const newCita: Cita = {
      id: '',
      paciente: cita.paciente.trim(),
      psicologo: cita.psicologo.trim(),
      fecha: cita.fecha,
      motivo: cita.motivo.trim(),
      estado: cita.estado ?? 'pendiente',
    };

    return this.backend.post<FirestoreCreateResponse>(this.citasUrl, this.toPayload(newCita)).pipe(
      map((response) => ({ ...newCita, id: response.id })),
      tap((createdCita) => {
        this.citasSubject.next(this.sortCitas([...this.citasSubject.value, createdCita]));
      }),
      catchError((error: unknown) =>
        throwError(() => new Error(extractBackendErrorMessage(error, 'No se pudo guardar la cita.'))),
      ),
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
}