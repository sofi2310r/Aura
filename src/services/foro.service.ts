import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { BackendService, extractBackendErrorMessage } from './backend.service';

export interface Comentario {
  texto: string;
  autor: string;
  anonimo: boolean;
  fecha: Date;
  reportado: boolean;
}

export interface Publicacion {
  id: string;
  titulo: string;
  contenido: string;
  anonima: boolean;
  autor: string;
  fecha: Date;
  comentarios: Comentario[];
}

interface FirestoreComentario {
  texto?: unknown;
  autor?: unknown;
  anonimo?: unknown;
  fecha?: unknown;
  reportado?: unknown;
}

interface FirestorePublicacionDocument {
  id: string;
  titulo?: unknown;
  contenido?: unknown;
  anonima?: unknown;
  autor?: unknown;
  fecha?: unknown;
  comentarios?: unknown;
}

interface FirestoreCreateResponse {
  id: string;
}

@Injectable({
  providedIn: 'root',
})
export class ForoService {
  private readonly publicacionesSubject = new BehaviorSubject<Publicacion[]>([]);
  private readonly publicacionesUrl = '/api/firestore/ForoPublicaciones';

  constructor(private readonly backend: BackendService) {
    this.refreshPublicaciones();
  }

  getPublicaciones(): Observable<Publicacion[]> {
    return this.publicacionesSubject.asObservable();
  }

  crearPublicacion(input: {
    titulo: string;
    contenido: string;
    anonima: boolean;
    autor?: string;
  }): Observable<Publicacion> {
    const nuevaPublicacion: Publicacion = {
      id: '',
      titulo: input.titulo.trim(),
      contenido: input.contenido.trim(),
      anonima: input.anonima,
      autor: input.anonima ? 'Anonima' : input.autor?.trim() || 'Usuario Aura',
      fecha: new Date(),
      comentarios: [],
    };

    return this.backend.post<FirestoreCreateResponse>(this.publicacionesUrl, this.toPublicacionPayload(nuevaPublicacion)).pipe(
      map((response) => ({ ...nuevaPublicacion, id: response.id })),
      tap((publicacion) => {
        this.publicacionesSubject.next(this.sortPublicaciones([publicacion, ...this.publicacionesSubject.value]));
      }),
      catchError((error: unknown) =>
        throwError(() => new Error(extractBackendErrorMessage(error, 'No se pudo publicar en el foro.'))),
      ),
    );
  }

  agregarComentario(
    publicacionId: string,
    input: {
      texto: string;
      anonimo: boolean;
      autor?: string;
    },
  ): Observable<Publicacion> {
    const publicacion = this.publicacionesSubject.value.find((item) => item.id === publicacionId);

    if (!publicacion) {
      return throwError(() => new Error('La publicacion ya no esta disponible.'));
    }

    const comentario: Comentario = {
      texto: input.texto.trim(),
      autor: input.anonimo ? 'Anonima' : input.autor?.trim() || 'Usuario Aura',
      anonimo: input.anonimo,
      fecha: new Date(),
      reportado: false,
    };

    const actualizada: Publicacion = {
      ...publicacion,
      comentarios: [...publicacion.comentarios, comentario],
    };

    return this.saveComentarios(actualizada, 'No se pudo guardar el comentario.');
  }

  reportarComentario(publicacionId: string, comentarioIndex: number): Observable<Publicacion> {
    const publicacion = this.publicacionesSubject.value.find((item) => item.id === publicacionId);

    if (!publicacion) {
      return throwError(() => new Error('La publicacion ya no esta disponible.'));
    }

    const comentarios = publicacion.comentarios.map((comentario, index) =>
      index === comentarioIndex ? { ...comentario, reportado: true } : comentario,
    );

    return this.saveComentarios({ ...publicacion, comentarios }, 'No se pudo reportar el comentario.');
  }

  private refreshPublicaciones(): void {
    this.backend
      .get<FirestorePublicacionDocument[]>(this.publicacionesUrl)
      .pipe(
        map((documents) => this.sortPublicaciones(documents.map((document) => this.mapPublicacion(document)))),
        catchError(() => of([])),
      )
      .subscribe((publicaciones) => {
        this.publicacionesSubject.next(publicaciones);
      });
  }

  private saveComentarios(publicacion: Publicacion, fallbackMessage: string): Observable<Publicacion> {
    return this.backend
      .patch<{ updated: boolean }>(`${this.publicacionesUrl}/${encodeURIComponent(publicacion.id)}`, {
        comentarios: publicacion.comentarios.map((comentario) => this.toComentarioPayload(comentario)),
      })
      .pipe(
        map(() => publicacion),
        tap((actualizada) => {
          this.publicacionesSubject.next(
            this.sortPublicaciones(
              this.publicacionesSubject.value.map((item) => (item.id === actualizada.id ? actualizada : item)),
            ),
          );
        }),
        catchError((error: unknown) =>
          throwError(() => new Error(extractBackendErrorMessage(error, fallbackMessage))),
        ),
      );
  }

  private mapPublicacion(document: FirestorePublicacionDocument): Publicacion {
    return {
      id: document.id,
      titulo: typeof document.titulo === 'string' && document.titulo.trim() ? document.titulo.trim() : 'Sin titulo',
      contenido:
        typeof document.contenido === 'string' && document.contenido.trim()
          ? document.contenido.trim()
          : 'Sin contenido.',
      anonima: document.anonima === true,
      autor: typeof document.autor === 'string' && document.autor.trim() ? document.autor.trim() : 'Usuario Aura',
      fecha: this.parseDate(document.fecha),
      comentarios: this.mapComentarios(document.comentarios),
    };
  }

  private mapComentarios(value: unknown): Comentario[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((comentario) => this.mapComentario(comentario as FirestoreComentario));
  }

  private mapComentario(comentario: FirestoreComentario): Comentario {
    return {
      texto: typeof comentario.texto === 'string' && comentario.texto.trim() ? comentario.texto.trim() : '',
      autor: typeof comentario.autor === 'string' && comentario.autor.trim() ? comentario.autor.trim() : 'Usuario Aura',
      anonimo: comentario.anonimo === true,
      fecha: this.parseDate(comentario.fecha),
      reportado: comentario.reportado === true,
    };
  }

  private toPublicacionPayload(publicacion: Publicacion): Record<string, unknown> {
    return {
      titulo: publicacion.titulo,
      contenido: publicacion.contenido,
      anonima: publicacion.anonima,
      autor: publicacion.autor,
      fecha: publicacion.fecha.toISOString(),
      comentarios: publicacion.comentarios.map((comentario) => this.toComentarioPayload(comentario)),
    };
  }

  private toComentarioPayload(comentario: Comentario): Record<string, unknown> {
    return {
      texto: comentario.texto,
      autor: comentario.autor,
      anonimo: comentario.anonimo,
      fecha: comentario.fecha.toISOString(),
      reportado: comentario.reportado,
    };
  }

  private parseDate(value: unknown): Date {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? new Date() : value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date();
  }

  private sortPublicaciones(publicaciones: Publicacion[]): Publicacion[] {
    return [...publicaciones].sort((left, right) => right.fecha.getTime() - left.fecha.getTime());
  }
}