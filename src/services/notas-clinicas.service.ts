import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BackendService } from './backend.service';

export interface NotaClinica {
  id: string;
  categoria: string;
  createdAt: string;
  diagnostico: string;
  fecha: string;
  observaciones: string;
  pacienteNombre: string;
  pacienteUid: string;
  planTratamiento: string;
  psicologoUid: string;
  psicologoNombre?: string;
  sintomas: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotasClinicasService {
  private readonly collection = 'notasClinicas';

  constructor(private readonly backend: BackendService) {}

  getNotasClinicas(filter?: { field: 'psicologoUid' | 'pacienteUid'; value: string }): Observable<NotaClinica[]> {
    if (filter?.value) {
      return this.backend
        .post<NotaClinica[]>(`/api/firestore/${this.collection}/query`, {
          field: filter.field,
          operator: '==',
          value: filter.value,
        })
        .pipe(map((docs) => docs.map((doc) => this.mapNota(doc))));
    }

    return this.backend.get<NotaClinica[]>(`/api/firestore/${this.collection}`).pipe(
      map((docs) => docs.map((doc) => this.mapNota(doc))),
    );
  }

  createNotaClinica(input: Omit<NotaClinica, 'id' | 'createdAt'>): Observable<{ id: string }> {
    return this.backend.post<{ id: string }>(`/api/firestore/${this.collection}`, input);
  }

  updateNotaClinica(id: string, input: Partial<Omit<NotaClinica, 'id' | 'createdAt'>>): Observable<{ id: string }> {
    return this.backend.put<{ id: string }>(`/api/firestore/${this.collection}/${encodeURIComponent(id)}`, input);
  }

  deleteNotaClinica(id: string): Observable<{ deleted: boolean }> {
    return this.backend.delete<{ deleted: boolean }>(`/api/firestore/${this.collection}/${encodeURIComponent(id)}`);
  }

  private mapNota(doc: any): NotaClinica {
    return {
      id: String(doc.id || ''),
      categoria: String(doc.categoria || ''),
      createdAt: String(doc.createdAt || doc.updatedAt || ''),
      diagnostico: String(doc.diagnostico || ''),
      fecha: String(doc.fecha || ''),
      observaciones: String(doc.observaciones || ''),
      pacienteNombre: String(doc.pacienteNombre || ''),
      pacienteUid: String(doc.pacienteUid || ''),
      planTratamiento: String(doc.planTratamiento || ''),
      psicologoUid: String(doc.psicologoUid || ''),
      psicologoNombre: String(doc.psicologoNombre || ''),
      sintomas: String(doc.sintomas || ''),
    };
  }
}
