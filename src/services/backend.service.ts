import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BackendService {

    /**
     * Sube un archivo al backend usando multipart/form-data
     * @param path Endpoint relativo (ej: '/api/upload-documento')
     * @param file Archivo a subir
     * @param extraData Objeto con datos adicionales (opcional)
     */
    uploadFile<T>(path: string, file: File, extraData?: Record<string, any>): Observable<T> {
      const formData = new FormData();
      formData.append('file', file);
      if (extraData) {
        Object.entries(extraData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }
      return this.http.post<T>(this.resolveUrl(path), formData);
    }
  // Punto unico para llamadas HTTP al backend Express
  // el ajuste se hace aqui y no en cada servicio :).
  private readonly baseUrl = 'https://backend-aura-d0or.onrender.com';

  constructor(private readonly http: HttpClient) {}

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(this.resolveUrl(path));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.resolveUrl(path), body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.resolveUrl(path), body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.resolveUrl(path), body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.resolveUrl(path));
  }

  private resolveUrl(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }
}

// Normaliza errores de HttpClient para que componentes y servicios muestren mensajes
// consistentes sin repetir la misma logica de parseo en toda la app.
export function extractBackendErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const { error: body } = error;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body && typeof body === 'object') {
      const maybeError = (body as { error?: unknown }).error;
      if (typeof maybeError === 'string' && maybeError.trim()) {
        return maybeError;
      }
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}