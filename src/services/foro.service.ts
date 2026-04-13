import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { BackendService, extractBackendErrorMessage } from './backend.service';
import { NotificacionService } from './notificacion.service';

export interface Comentario {
  texto: string;
  autor: string;
  fecha: Date;
  reportado: boolean;
  rol?: string;
  respuestas?: Respuesta[];
}

export interface Publicacion {
  id: string;
  titulo: string;
  contenido: string;
  autor?: string;
  rol?: string;
  fecha: Date;
  comentarios: Comentario[];
}

export interface Respuesta {
  id?: string;
  texto: string;
  autor: string;
  fecha: Date | string;
  rol?: string;
  esProfesional?: boolean;
}

export interface ComentarioExtendido extends Comentario {
  id?: string;
  respuestas?: Respuesta[];
}

interface FirestoreComentario {
  texto?: unknown;
  autor?: unknown;
  fecha?: unknown;
  reportado?: unknown;
}

interface FirestorePublicacionDocument {
  id: string;
  titulo?: unknown;
  contenido?: unknown;
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

  constructor(private readonly backend: BackendService,
    private notificacionService: NotificacionService
  ) {
    this.refreshPublicaciones();
  }

  getPublicaciones(): Observable<Publicacion[]> {
    return this.publicacionesSubject.asObservable();
  }

  crearPublicacion(input: {
    titulo: string;
    contenido: string;
    autor?: string;
  }): Observable<Publicacion> {
    const nuevaPublicacion: Publicacion = {
      id: '',
      titulo: input.titulo.trim(),
      contenido: input.contenido.trim(),
      autor: input.autor?.trim() || 'Usuario Aura',
      fecha: new Date(),
      comentarios: [],
    };

    return this.backend.post<FirestoreCreateResponse>(this.publicacionesUrl, this.toPublicacionPayload(nuevaPublicacion)).pipe(
      map((response) => ({ ...nuevaPublicacion, id: response.id })),
      tap((publicacion) => {
        const listaActualizada = [publicacion, ...this.publicacionesSubject.value];
        this.publicacionesSubject.next(this.sortPublicaciones(listaActualizada));
      }),
      catchError((error: unknown) =>
        throwError(() => new Error(extractBackendErrorMessage(error, 'No se pudo publicar en el foro.'))),
      ),
    );
  }

  agregarComentario(
    id: string,
    input: Comentario
  ): Observable<Publicacion> {

    const publicacion = this.publicacionesSubject.value.find(
      (item) => item.id === id
    );

    if (!publicacion) {
      return throwError(() => new Error('La publicación ya no está disponible.'));
    }

    const comentario: Comentario = {
      texto: input.texto.trim(),
      autor: input.autor?.trim() || 'Usuario',
      rol: input.rol || 'usuario',
      fecha: input.fecha || new Date(),
      respuestas: [],
      reportado: false
    };

    const actualizada: Publicacion = {
      ...publicacion,
      comentarios: [...publicacion.comentarios, comentario],
    };

    return this.saveComentarios(
      actualizada,
      'No se pudo guardar el comentario.'
    );
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

  agregarRespuesta(
    pubicacionId: string,
    comentarioIndex: number,
    input: { texto: string; autor?: string }
  ): Observable<Publicacion> {

    const publicacion = this.publicacionesSubject.value.find(p => p.id === pubicacionId);
    if (!publicacion) {
      return throwError(() => new Error('Publicación no encontrada'));
    }

    const comentario = publicacion.comentarios[comentarioIndex];

    const respuesta: Respuesta = {
      texto: input.texto.trim(),
      autor: input.autor?.trim() || 'Usuario Aura',
      fecha: new Date()
    };

    const respuestas = (comentario as ComentarioExtendido).respuestas || [];

    const comentarioActualizado: ComentarioExtendido = {
      ...comentario,
      respuestas: [...respuestas, respuesta]
    };

    const comentariosActualizados = [...publicacion.comentarios];
    comentariosActualizados[comentarioIndex] = comentarioActualizado;

    return this.saveComentarios(
      { ...publicacion, comentarios: comentariosActualizados },
      'No se pudo guardar la respuesta'
    );
  }

  actualizarPublicacion(id: string, cambios: { titulo: string, contenido: string }): Observable<any> {
    return this.backend.patch(`${this.publicacionesUrl}/${encodeURIComponent(id)}`, cambios).pipe(
      tap(() => {
        const listaActual = this.publicacionesSubject.value.map(pub =>
          pub.id === id ? { ...pub, ...cambios } : pub
        );
        this.publicacionesSubject.next(this.sortPublicaciones(listaActual));
      }),
      catchError((error: unknown) =>
        throwError(() => new Error(extractBackendErrorMessage(error, 'No se pudo actualizar la publicación.'))))
    );
  }

  eliminarPublicacion(publicacionId: string): Observable<void> {
    return this.backend.delete<void>(`${this.publicacionesUrl}/${encodeURIComponent(publicacionId)}`).pipe(
      tap(() => {
        const listaActual = this.publicacionesSubject.value;
        const listaFiltrada = listaActual.filter((p) => p.id !== publicacionId);
        this.publicacionesSubject.next(listaFiltrada);
      }),
      catchError((error: unknown) =>
        throwError(() => new Error(extractBackendErrorMessage(error, 'No se puede eliminar la  publicación.'))),
      ),
    );
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
          this.notificacionService.enviar('🚨 Nuevo comentario reportado');

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
      fecha: this.parseDate(comentario.fecha),
      reportado: comentario.reportado === true,
      respuestas: Array.isArray((comentario as any).respuestas)
        ? (comentario as any).respuestas.map((r: any) => ({
          texto: r.texto,
          autor: r.autor,
          fecha: this.parseDate(r.fecha)
        }))
        : []
    } as any;
  }

  private toPublicacionPayload(publicacion: Publicacion): Record<string, unknown> {
    return {
      titulo: publicacion.titulo,
      contenido: publicacion.contenido,
      autor: publicacion.autor,
      fecha: publicacion.fecha.toISOString(),
      comentarios: publicacion.comentarios.map((comentario) => this.toComentarioPayload(comentario)),
    };
  }

  private toComentarioPayload(comentario: Comentario): Record<string, unknown> {
    return {
      texto: comentario.texto,
      autor: comentario.autor,
      fecha: comentario.fecha.toISOString(),
      reportado: comentario.reportado,
      respuestas: (comentario.respuestas || []).map((r: any) => ({
        texto: r.texto,
        autor: r.autor,
        fecha: r.fecha.toISOString()
      }))
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

  crearNotificacion(input: {
    para: string;
    mensaje: string;
  }) {
    return this.backend.post('/api/firestore/notificaciones', {
      paraUid: input.para,
      mensaje: input.mensaje,
      fecha: new Date().toISOString(),
      leida: false
    });
  }

  getNotificaciones(uid: string) {
    return this.backend.get<any[]>('/api/firestore/notificaciones').pipe(
      map(n => n.filter(x => x.paraUid === uid))
    );
  }
}