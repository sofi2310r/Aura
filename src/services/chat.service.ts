import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, switchMap, throwError } from 'rxjs';
import { BackendService } from './backend.service';

export interface ChatMessage {
  autor: string;
  autorUid: string;
  fecha: string;
  texto: string;
}

export interface ChatConversation {
  id: string;
  Documento_psicologo: string;
  Documento_usuario: string;
  nombre_psicologo?: string;
  nombre_usuario?: string;
  Fecha_inicio?: string;
  Mensaje?: string;
  Motivo?: string;
  Categoria?: string;
  Mensajes: ChatMessage[];
  UltimoAutorUid?: string;
  updatedAt?: string;
}

interface ChatDocument {
  id: string;
  chatId?: unknown;
  _id?: unknown;
  Documento_psicologo?: unknown;
  documento_psicologo?: unknown;
  Documento_usuario?: unknown;
  documento_usuario?: unknown;
  nombre_psicologo?: unknown;
  nombrePsicologo?: unknown;
  nombre_usuario?: unknown;
  nombreUsuario?: unknown;
  Fecha_inicio?: unknown;
  fecha_inicio?: unknown;
  Mensaje?: unknown;
  mensaje?: unknown;
  Mensajes?: unknown;
  mensajes?: unknown;
  Motivo?: unknown;
  motivo?: unknown;
  Categoria?: unknown;
  categoria?: unknown;
  UltimoAutorUid?: unknown;
  ultimoAutorUid?: unknown;
  updatedAt?: unknown;
}

interface SendMessageResponse {
  id?: unknown;
  Mensaje?: unknown;
  Mensajes?: unknown;
  UltimoAutorUid?: unknown;
  updatedAt?: unknown;
}

interface CreateChatResponse {
  id?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly chatsUrl = '/api/chats';

  constructor(private readonly backend: BackendService) {}

  getChatsByPsicologo(documentoPsicologo: string): Observable<ChatConversation[]> {
    return this.backend.get<unknown>(this.chatsUrl, {
      params: { documento: documentoPsicologo },
    }).pipe(
      map((response) => this.extractChatArray(response)),
      map((docs) => docs.map((doc) => this.mapConversation(doc))),
      map((conversations) =>
        conversations.sort((a, b) =>
          new Date(b.updatedAt || b.Fecha_inicio || 0).getTime() -
          new Date(a.updatedAt || a.Fecha_inicio || 0).getTime(),
        ),
      ),
    );
  }

  getChatById(chatId: string): Observable<ChatConversation> {
    return this.backend
      .get<ChatDocument>(`${this.chatsUrl}/${encodeURIComponent(chatId)}`)
      .pipe(map((doc) => this.mapConversation(doc)));
  }

  createChat(input: {
    documentoUsuario: string;
    documentoPsicologo: string;
    nombreUsuario?: string;
    nombrePsicologo?: string;
  }): Observable<ChatConversation> {
    const payload = {
      Documento_usuario: input.documentoUsuario,
      Documento_psicologo: input.documentoPsicologo,
      nombre_usuario: input.nombreUsuario || '',
      nombre_psicologo: input.nombrePsicologo || '',
    };

    return this.backend.post<CreateChatResponse>(this.chatsUrl, payload).pipe(
      switchMap((response) => {
        const chatId = typeof response?.id === 'string' ? response.id : '';
        return this.getChatById(chatId);
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 409) {
          const conflictId = (error.error && typeof error.error === 'object' && typeof error.error.id === 'string')
            ? error.error.id
            : '';

          if (conflictId) {
            return this.getChatById(conflictId);
          }
        }

        return throwError(() => error);
      }),
    );
  }

  sendMessage(input: {
    chatId: string;
    autor: string;
    autorUid: string;
    texto: string;
  }): Observable<ChatConversation> {
    const texto = input.texto.trim();
    const now = new Date().toISOString();

    const payload = {
      texto,
      autor: input.autor,
      autorUid: input.autorUid,
      fecha: now,
      Mensaje: texto,
    };

    return this.backend
      .patch<SendMessageResponse>(`${this.chatsUrl}/${encodeURIComponent(input.chatId)}/mensaje`, payload)
      .pipe(
        switchMap((response) => {
          const responseMessages = Array.isArray(response?.Mensajes) ? response.Mensajes : null;
          if (!responseMessages) {
            return this.getChatById(input.chatId);
          }

          return this.getChatById(input.chatId).pipe(
            map((current) => ({
              ...current,
              id:
                (typeof response.id === 'string' && response.id) ||
                current.id ||
                input.chatId,
              Mensaje:
                (typeof response.Mensaje === 'string' && response.Mensaje) ||
                current.Mensaje ||
                texto,
              Mensajes: this.mapMessageArray(responseMessages),
              UltimoAutorUid:
                (typeof response.UltimoAutorUid === 'string' && response.UltimoAutorUid) ||
                current.UltimoAutorUid ||
                input.autorUid,
              updatedAt:
                (typeof response.updatedAt === 'string' && response.updatedAt) ||
                current.updatedAt ||
                now,
            })),
          );
        }),
      );
  }

  private mapConversation(doc: ChatDocument): ChatConversation {
    const rawMensajes = Array.isArray(doc.Mensajes)
      ? doc.Mensajes
      : Array.isArray(doc.mensajes)
        ? doc.mensajes
        : [];

    const mensajes = rawMensajes
          .map((item) => this.mapMessage(item))
          .filter((message): message is ChatMessage => message !== null)

    const conversationId =
      (typeof doc.id === 'string' && doc.id) ||
      (typeof doc.chatId === 'string' && doc.chatId) ||
      (typeof doc._id === 'string' && doc._id) ||
      '';

    const documentoPsicologo =
      (typeof doc.Documento_psicologo === 'string' && doc.Documento_psicologo) ||
      (typeof doc.documento_psicologo === 'string' && doc.documento_psicologo) ||
      '';

    const documentoUsuario =
      (typeof doc.Documento_usuario === 'string' && doc.Documento_usuario) ||
      (typeof doc.documento_usuario === 'string' && doc.documento_usuario) ||
      '';

    const nombrePsicologo =
      (typeof doc.nombre_psicologo === 'string' && doc.nombre_psicologo) ||
      (typeof doc.nombrePsicologo === 'string' && doc.nombrePsicologo) ||
      undefined;

    const nombreUsuario =
      (typeof doc.nombre_usuario === 'string' && doc.nombre_usuario) ||
      (typeof doc.nombreUsuario === 'string' && doc.nombreUsuario) ||
      undefined;

    const fechaInicio =
      (typeof doc.Fecha_inicio === 'string' && doc.Fecha_inicio) ||
      (typeof doc.fecha_inicio === 'string' && doc.fecha_inicio) ||
      undefined;

    const ultimoMensaje =
      (typeof doc.Mensaje === 'string' && doc.Mensaje) ||
      (typeof doc.mensaje === 'string' && doc.mensaje) ||
      undefined;

    const motivo =
      (typeof doc.Motivo === 'string' && doc.Motivo) ||
      (typeof doc.motivo === 'string' && doc.motivo) ||
      undefined;

    const categoria =
      (typeof doc.Categoria === 'string' && doc.Categoria) ||
      (typeof doc.categoria === 'string' && doc.categoria) ||
      undefined;

    const ultimoAutorUid =
      (typeof doc.UltimoAutorUid === 'string' && doc.UltimoAutorUid) ||
      (typeof doc.ultimoAutorUid === 'string' && doc.ultimoAutorUid) ||
      undefined;

    return {
      id: conversationId,
      Documento_psicologo: documentoPsicologo,
      Documento_usuario: documentoUsuario,
      nombre_psicologo: nombrePsicologo,
      nombre_usuario: nombreUsuario,
      Fecha_inicio: fechaInicio,
      Mensaje: ultimoMensaje,
      Motivo: motivo,
      Categoria: categoria,
      Mensajes: mensajes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()),
      UltimoAutorUid: ultimoAutorUid,
      updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : undefined,
    };
  }

  private mapMessage(value: unknown): ChatMessage | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const raw = value as Record<string, unknown>;
    const autor = typeof raw['autor'] === 'string' ? raw['autor'] : '';
    const autorUid = typeof raw['autorUid'] === 'string' ? raw['autorUid'] : '';
    const fecha = typeof raw['fecha'] === 'string' ? raw['fecha'] : new Date().toISOString();
    const texto = typeof raw['texto'] === 'string' ? raw['texto'] : '';

    if (!texto.trim()) {
      return null;
    }

    return { autor, autorUid, fecha, texto };
  }

  private mapMessageArray(values: unknown[]): ChatMessage[] {
    return values
      .map((item) => this.mapMessage(item))
      .filter((message): message is ChatMessage => message !== null)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }

  private extractChatArray(response: unknown): ChatDocument[] {
    if (Array.isArray(response)) {
      return response as ChatDocument[];
    }

    if (response && typeof response === 'object') {
      const raw = response as Record<string, unknown>;

      if (Array.isArray(raw['value'])) {
        return raw['value'] as ChatDocument[];
      }

      if (Array.isArray(raw['data'])) {
        return raw['data'] as ChatDocument[];
      }

      if (Array.isArray(raw['chats'])) {
        return raw['chats'] as ChatDocument[];
      }
    }

    return [];
  }
}
