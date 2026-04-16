import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, interval, map, of, startWith, switchMap, tap, throwError } from 'rxjs';
import { BackendService, extractBackendErrorMessage } from './backend.service';
import { NotificacionService } from './notificacion.service';

export interface Comentario {
  texto: string;
  autor: string;
  autorUid: string;
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
  Comentarios: Comentario[];
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
  rol?: unknown;
  role?: unknown;
  fecha?: unknown;
  Comentarios?: unknown;
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
  private readonly refreshIntervalMs = 6000;
  private lastPublicacionesSignature = '';

  constructor(private readonly backend: BackendService,
    private notificacionService: NotificacionService
  ) {
    this.startAutoRefresh();
  }

  getPublicaciones(): Observable<Publicacion[]> {
    return this.publicacionesSubject.asObservable();
  }

  crearPublicacion(input: {
    titulo: string;
    contenido: string;
    autor?: string;
    rol?: string;
  }): Observable<Publicacion> {
    const nuevaPublicacion: Publicacion = {
      id: '',
      titulo: input.titulo.trim(),
      contenido: input.contenido.trim(),
      autor: input.autor?.trim() || 'Usuario Aura',
      rol: input.rol?.trim() || 'usuario',
      fecha: new Date(),
      Comentarios: [],
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

    const Comentario: Comentario = {
      texto: input.texto.trim(),
      autor: input.autor?.trim() || 'Usuario',
      autorUid: input.autorUid || '',
      rol: input.rol || 'usuario',
      fecha: input.fecha || new Date(),
      respuestas: [],
      reportado: false
    };

    const actualizada: Publicacion = {
      ...publicacion,
      Comentarios: [...publicacion.Comentarios, Comentario],
    };

    return this.saveComentarios(
      actualizada,
      'No se pudo guardar el comentario.'
    );
  }

  reportarComentario(publicacionId: string, ComentarioIndex: number): Observable<Publicacion> {
    const publicacion = this.publicacionesSubject.value.find((item) => item.id === publicacionId);

    if (!publicacion) {
      return throwError(() => new Error('La publicacion ya no esta disponible.'));
    }

    const Comentarios = publicacion.Comentarios.map((Comentario, index) =>
      index === ComentarioIndex ? { ...Comentario, reportado: true } : Comentario,
    );
    return this.saveComentarios({ ...publicacion, Comentarios }, 'No se pudo reportar el comentario.');
  }

  agregarRespuesta(
    pubicacionId: string,
    ComentarioIndex: number,
    input: { texto: string; autor?: string }
  ): Observable<Publicacion> {

    const publicacion = this.publicacionesSubject.value.find(p => p.id === pubicacionId);
    if (!publicacion) {
      return throwError(() => new Error('Publicación no encontrada'));
    }

    const Comentario = publicacion.Comentarios[ComentarioIndex];

    const respuesta: Respuesta = {
      texto: input.texto.trim(),
      autor: input.autor?.trim() || 'Usuario Aura',
      fecha: new Date()
    };

    const respuestas = (Comentario as ComentarioExtendido).respuestas || [];

    const ComentarioActualizado: ComentarioExtendido = {
      ...Comentario,
      respuestas: [...respuestas, respuesta]
    };

    const ComentariosActualizados = [...publicacion.Comentarios];
    ComentariosActualizados[ComentarioIndex] = ComentarioActualizado;

    return this.saveComentarios(
      { ...publicacion, Comentarios: ComentariosActualizados },
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

  private startAutoRefresh(): void {
    interval(this.refreshIntervalMs)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.backend
            .get<FirestorePublicacionDocument[]>(this.publicacionesUrl)
            .pipe(
              map((documents) => this.sortPublicaciones(documents.map((document) => this.mapPublicacion(document)))),
              catchError(() => of([])),
            ),
        ),
      )
      .subscribe((publicaciones) => {
        const signature = this.buildPublicacionesSignature(publicaciones);

        if (signature !== this.lastPublicacionesSignature) {
          this.lastPublicacionesSignature = signature;
          this.publicacionesSubject.next(publicaciones);
        }
      });
  }

  private buildPublicacionesSignature(publicaciones: Publicacion[]): string {
    return publicaciones
      .map((pub) => {
        const lastComentario = pub.Comentarios.at(-1);
        const totalRespuestas = pub.Comentarios.reduce(
          (total, Comentario) => total + (Comentario.respuestas?.length || 0),
          0,
        );

        return [
          pub.id,
          pub.titulo,
          pub.contenido,
          pub.autor || '',
          pub.rol || '',
          pub.fecha.getTime(),
          pub.Comentarios.length,
          totalRespuestas,
          lastComentario?.texto || '',
          lastComentario?.autor || '',
          lastComentario?.fecha ? new Date(lastComentario.fecha).getTime() : 0,
        ].join('|');
      })
      .join('||');
  }

  private saveComentarios(publicacion: Publicacion, fallbackMessage: string): Observable<Publicacion> {
    return this.backend
      .patch<{ updated: boolean }>(`${this.publicacionesUrl}/${encodeURIComponent(publicacion.id)}`, {
        Comentarios: publicacion.Comentarios.map((Comentario) => this.toComentarioPayload(Comentario)),
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
      rol:
        typeof document.rol === 'string' && document.rol.trim()
          ? document.rol.trim().toLowerCase()
          : typeof document.role === 'string' && document.role.trim()
            ? document.role.trim().toLowerCase()
            : 'usuario',
      fecha: this.parseDate(document.fecha),
      Comentarios: this.mapComentarios((document as any).Comentarios),
    };
  }

  private mapComentarios(value: unknown): Comentario[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((Comentario) => this.mapComentario(Comentario as FirestoreComentario));
  }

  private mapComentario(Comentario: FirestoreComentario): Comentario {
      console.log('[DEBUG comentario recibido]', Comentario);
    return {
      texto: typeof Comentario.texto === 'string' && Comentario.texto.trim() ? Comentario.texto.trim() : '',
      autor: typeof Comentario.autor === 'string' && Comentario.autor.trim() ? Comentario.autor.trim() : 'Usuario Aura',
      autorUid: typeof (Comentario as any).autorUid === 'string' ? (Comentario as any).autorUid : '',
      fecha: this.parseDate(Comentario.fecha),
      reportado: Comentario.reportado === true,
      respuestas: Array.isArray((Comentario as any).respuestas)
        ? (Comentario as any).respuestas.map((r: any) => ({
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
      rol: publicacion.rol || 'usuario',
      fecha: publicacion.fecha.toISOString(),
      Comentarios: publicacion.Comentarios.map((Comentario) => this.toComentarioPayload(Comentario)),
    };
  }

  private toComentarioPayload(Comentario: Comentario): Record<string, unknown> {
    return {
      texto: Comentario.texto,
      autor: Comentario.autor,
      fecha: Comentario.fecha.toISOString(),
      reportado: Comentario.reportado,
      respuestas: (Comentario.respuestas || []).map((r: any) => ({
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