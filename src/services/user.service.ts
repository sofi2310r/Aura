import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, firstValueFrom, map, of, switchMap, tap, throwError } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { BackendService, extractBackendErrorMessage } from './backend.service';
import { take } from 'rxjs'; // CORRECCIÓN: Importación necesaria para sumarReporte

interface FirestoreUserDocument {
  id: string;
  uid?: unknown;
  nombre?: unknown;
  apellido?: unknown;
  correo?: unknown;
  rol?: unknown;
  role?: unknown;
  activo?: unknown;
  documento?: unknown;
  fechaNacimiento?: unknown;
  edad?: unknown;
  telefono?: unknown;
  documentoUrl?: unknown;
  reporte?: unknown;
  permisos?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  nombrePadre?: unknown;
  observacionesPadres?: unknown;
  parentescoPadre?: unknown;
  autorizacionPadres?: unknown;
}

interface FirestoreCreateResponse {
  id: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {

  /**
   * Actualiza campos de un usuario por su UID
   */
  public async updateUserByUid(uid: string, data: Partial<User>): Promise<void> {
    // Buscar usuario por UID
    const response = await firstValueFrom(
      this.backend.post<FirestoreUserDocument[]>(`${this.usersUrl}/query`, {
        field: 'uid',
        operator: '==',
        value: uid,
      })
    );
    if (!response || response.length === 0) throw new Error('Usuario no encontrado');
    const userId = response[0].id;
    await firstValueFrom(
      this.backend.patch(`${this.usersUrl}/${encodeURIComponent(userId)}`, data)
    );
  }

  /**
   * Actualiza campos de un usuario por su número de documento
   */
  public async updateUserByDocumento(documento: string, data: Partial<User>): Promise<void> {
    // Buscar usuario por documento
    const response = await firstValueFrom(
      this.backend.post<FirestoreUserDocument[]>(`${this.usersUrl}/query`, {
        field: 'documento',
        operator: '==',
        value: documento,
      })
    );
    if (!response || response.length === 0) throw new Error('Usuario no encontrado');
    const userId = response[0].id;
    await firstValueFrom(
      this.backend.put(`${this.usersUrl}/${encodeURIComponent(userId)}`, data)
    );
  }
  private readonly usersSubject = new BehaviorSubject<User[]>([]);
  private readonly usersUrl = '/api/firestore/usuarios';

  constructor(private readonly backend: BackendService) {
    if (this.hasStoredAuthToken()) {
      this.refreshUsers();
    }
  }

  getUsers(): Observable<User[]> {
    return this.usersSubject.asObservable();
  }

  getByRole(role: UserRole): Observable<User[]> {
    return this.getUsers().pipe(map((users) => users.filter((user) => user.rol === role)));
  }

  getUserById(uid: string): Observable<User | undefined> {
    return this.getUsers().pipe(map((users) => users.find((user) => user.uid === uid)));
  }

  refresh(): void {
    this.refreshUsers();
  }

  async findUserByEmail(correo: string): Promise<User | null> {
    const normalizedEmail = correo.trim().toLowerCase();

    if (!normalizedEmail) {
      return null;
    }

    try {
      // Hacer query y esperar resultado
      const response = await firstValueFrom(
        this.backend
          .post<FirestoreUserDocument[]>(`${this.usersUrl}/query`, {
            field: 'correo',
            operator: '==',
            value: normalizedEmail,
          })
          .pipe(
            map((users) => (users.length > 0 ? this.mapUser(users[0]) : null)),
            catchError(() => of(null)),
          ),
      );
      return response;
    } catch {
      return null;
    }
  }

  addUser(user: Omit<User, 'id'>, documentId?: string, authToken?: string): Observable<User> {
    const payload = this.toPayload(user);
    const authHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;

    // Si hay documentId (registro), guardar directamente sin query
    if (documentId) {
      return this.backend
        .put<FirestoreCreateResponse>(`${this.usersUrl}/${encodeURIComponent(documentId)}`, payload, {
          headers: authHeaders,
        })
        .pipe(
          map((response) => ({ id: response.id, ...payload } as User)),
          tap((createdUser) => {
            const remainingUsers = this.usersSubject.value.filter((item) => item.id !== createdUser.id);
            this.usersSubject.next(this.sortUsers([...remainingUsers, createdUser]));
            this.refreshUsers(); // <--- RECARGA AUTOMÁTICA DE LA LISTA TRAS EL REGISTRO
          }),
          catchError((error: unknown) =>
            throwError(() => new Error(extractBackendErrorMessage(error, 'No se pudo guardar el usuario.'))),
          ),
        );
    }

    // Sin documentId, hacer POST con query de duplicados
    return this.backend
      .post<FirestoreUserDocument[]>(`${this.usersUrl}/query`, {
        field: 'correo',
        operator: '==',
        value: payload.correo,
      }, {
        headers: authHeaders,
      })
      .pipe(
        switchMap((users) => {
          if (users.length > 0) {
            return throwError(() => new Error('Ese correo ya existe. Intenta con otro.'));
          }
          return this.backend.post<FirestoreCreateResponse>(this.usersUrl, payload, {
            headers: authHeaders,
          });
        }),
        map((response) => ({ id: response.id, ...payload } as User)),
        tap((createdUser) => {
          const remainingUsers = this.usersSubject.value.filter((item) => item.id !== createdUser.id);
          this.usersSubject.next(this.sortUsers([...remainingUsers, createdUser]));
          this.refreshUsers(); // <--- RECARGA AUTOMÁTICA DE LA LISTA TRAS EL REGISTRO
        }),
        catchError((error: unknown) =>
          throwError(() => new Error(extractBackendErrorMessage(error, 'No se pudo guardar el usuario.'))),
        ),
      );
  }

  removeUser(id: string): Observable<void> {
    // 1. Guardamos el estado actual por si hay que revertir (Rollback)
    const usuariosPrevios = this.usersSubject.value;

    // 2. ACTUALIZACIÓN OPTIMISTA: Eliminamos de la memoria del servicio YA
    const nuevaLista = usuariosPrevios.filter((user) => user.id !== id);
    setTimeout(() => this.usersSubject.next(nuevaLista), 0);

    // 3. Ejecutamos la petición al backend
    return this.backend.delete<{ deleted: boolean }>(`${this.usersUrl}/${encodeURIComponent(id)}`).pipe(
      map(() => undefined),
      catchError((error: unknown) => {
        // 4. ROLLBACK: Si el servidor da error, devolvemos el usuario a la lista
        setTimeout(() => this.usersSubject.next(usuariosPrevios), 0);

        const mensaje = extractBackendErrorMessage(error, 'No se pudo eliminar el usuario.');
        return throwError(() => new Error(mensaje));
      })
    );
  }

  updateUser(user: User): Observable<User>;
  updateUser(id: string, data: Partial<User>): Observable<User>;
  updateUser(user: Partial<User> & { id?: string }): Observable<User>; // Firma flexible

  updateUser(idOrUser: any, data?: Partial<User>): Observable<User> {
    let id: string;
    let payload: any;
    let isFullUpdate = false;

    if (typeof idOrUser === 'string') {
      id = idOrUser;
      payload = data; // Si pasas ID y Data, el payload es el objeto parcial
    } else {
      id = (idOrUser.id || idOrUser.uid) as string;
      payload = idOrUser.correo ? this.toPayload(idOrUser as User) : idOrUser;
      isFullUpdate = true;
    }

    const existingUser = this.usersSubject.value.find((u) => u.id === id || u.uid === id);
    if (existingUser && payload && Object.keys(payload).length > 0) {
      const hasChanges = Object.entries(payload).some(([key, value]) => {
        const existingValue = (existingUser as any)[key];
        return value !== existingValue;
      });

      if (!hasChanges) {
        // No hay cambios reales: devolvemos el usuario actual sin escribir en Firestore.
        return of(isFullUpdate ? (idOrUser as User) : ({ id, ...payload } as User));
      }
    }

    // Importante: encodeURIComponent para evitar errores de caracteres en el ID
    const request$ = typeof idOrUser === 'string'
      ? this.backend.patch<FirestoreCreateResponse>(`${this.usersUrl}/${encodeURIComponent(id)}`, payload)
      : this.backend.put<FirestoreCreateResponse>(`${this.usersUrl}/${encodeURIComponent(id)}`, payload);

    return request$.pipe(
      // Forzamos a que el observable devuelva el resultado y se complete
      map(() => (typeof idOrUser === 'object' ? idOrUser : { id, ...payload } as User)),
      tap((updatedUser) => {
        const currentUsers = this.usersSubject.value;
        const updatedList = currentUsers.map((u) =>
          (u.id === id || u.uid === id) ? { ...u, ...payload } : u
        );
        this.usersSubject.next(this.sortUsers(updatedList));
      }),
      catchError((error: unknown) =>
        throwError(() => new Error(extractBackendErrorMessage(error, 'No se pudo actualizar.')))
      )
    );
  }

  bloquearUsuario(uid: string) {
    return this.backend.patch(`${this.usersUrl}/${uid}`, {
      activo: false
    });
  }


  private refreshUsers(): void {
    if (!this.hasStoredAuthToken()) {
      return;
    }

    this.backend
      .get<FirestoreUserDocument[]>(this.usersUrl)
      .pipe(
        map((users) => this.sortUsers(users.map((user) => this.mapUser(user)))),
        catchError(() => of([])),
      )
      .subscribe((users) => {
        this.usersSubject.next(users);
      });
  }

  private mapUser(user: FirestoreUserDocument): User {
    const normalizedRole = this.normalizeRole(user.role ?? user.rol);

    // Convertir documento de Firestore a modelo User con tipos seguros
    return {
      id: user.id,
      uid: typeof user.uid === 'string' ? user.uid : '',
      nombre: typeof user.nombre === 'string' && user.nombre.trim() ? user.nombre.trim() : 'usuario Aura',
      apellido: typeof user.apellido === 'string' && user.apellido.trim() ? user.apellido.trim() : undefined,
      correo: typeof user.correo === 'string' ? user.correo.trim().toLowerCase() : '',
      rol: normalizedRole,
      role: normalizedRole,
      activo: user.activo !== false,
      documento: typeof user.documento === 'string' && user.documento.trim() ? user.documento.trim() : undefined,
      fechaNacimiento:
        typeof user.fechaNacimiento === 'string' && user.fechaNacimiento.trim() ? user.fechaNacimiento.trim() : undefined,
      edad: typeof user.edad === 'number' ? user.edad : undefined,
      telefono: typeof user.telefono === 'string' && user.telefono.trim() ? user.telefono.trim() : undefined,
      documentoUrl: typeof user.documentoUrl === 'string' && user.documentoUrl.trim() ? user.documentoUrl.trim() : undefined,
      reporte: typeof user.reporte === 'number' ? user.reporte : 0,
      bloqueado: user.activo === false ? true : false,
      permisos: typeof user.permisos === 'string' && user.permisos.trim() ? user.permisos.trim() : undefined,
      createdAt: typeof user.createdAt === 'string' ? user.createdAt : undefined,
      updatedAt: typeof user.updatedAt === 'string' ? user.updatedAt : undefined,
      nombrePadre: typeof user.nombrePadre === 'string' && user.nombrePadre.trim() ? user.nombrePadre.trim() : undefined,
      observacionesPadres: typeof user.observacionesPadres === 'string' && user.observacionesPadres.trim() ? user.observacionesPadres.trim() : undefined,
      parentescoPadre: typeof user.parentescoPadre === 'string' && user.parentescoPadre.trim() ? user.parentescoPadre.trim() : undefined,
      autorizacionPadres: typeof user.autorizacionPadres === 'object' ? user.autorizacionPadres : undefined,
    } as User;
  }

  private toPayload(user: Omit<User, 'id'>): Omit<User, 'id'> {
    const normalizedRole = this.normalizeRole(user.role ?? user.rol);

    // Preparar datos limpios para guardar en Firestore
    return {
      uid: user.uid,
      nombre: user.nombre.trim(),
      apellido: user.apellido?.trim() || undefined,
      correo: user.correo.trim().toLowerCase(),
      role: normalizedRole,
      activo: user.activo ?? false,
      documento: user.documento?.trim() || undefined,
      fechaNacimiento: user.fechaNacimiento?.trim() || undefined,
      edad: user.edad,
      telefono: user.telefono?.trim() || undefined,
      documentoUrl: user.documentoUrl?.trim() || undefined,
      reporte: user.reporte ?? 0,
      permisos: user.permisos?.trim() || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      nombrePadre: user.nombrePadre?.trim() || undefined,
      observacionesPadres: user.observacionesPadres?.trim() || undefined,
      parentescoPadre: user.parentescoPadre?.trim() || undefined,
      autorizacionPadres: user.autorizacionPadres,
    } as Omit<User, 'id'>;
  }

  private normalizeRole(role: unknown): UserRole {
    const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';

    if (
      normalizedRole === 'admin' ||
      normalizedRole === 'administrador' ||
      normalizedRole === 'psicologo' ||
      normalizedRole === 'moderador' ||
      normalizedRole === 'paciente' ||
      normalizedRole === 'usuario'
    ) {
      return normalizedRole as UserRole;
    }

    return 'paciente';
  }

  private sortUsers(users: User[]): User[] {
    return [...users].sort((left, right) => left.nombre.localeCompare(right.nombre, 'es'));
  }

  private hasStoredAuthToken(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    return Boolean(
      localStorage.getItem('aura.auth-token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('authToken')
    );
  }

  sumarReportePorUid(uid: string): Observable<User> {
    return this.getUsers().pipe(
      take(1),
      switchMap(users => {
        const usuario = users.find(u => u.uid === uid);

        if (!usuario) {
          return throwError(() => new Error('No se encontró un perfil de usuario con ese uid'));
        }

        const nuevosReportes = (usuario.reporte || 0) + 1;

        return this.updateUser({
          ...usuario,
          reporte: nuevosReportes
        });
      })
    );
  }

  sumarReportePorNombre(nombreAutor: string): Observable<User> {
    return this.getUsers().pipe(
      take(1), // Tomamos la lista actual de usuarios una sola vez
      switchMap(users => {
        const usuario = users.find(u => u.nombre.trim().toLowerCase() === nombreAutor.trim().toLowerCase());

        if (!usuario) {
          return throwError(() => new Error('No se encontró un perfil de usuario con ese nombre'));
        }

        const nuevosReportes = (usuario.reporte || 0) + 1;

        return this.updateUser({
          ...usuario,
          reporte: nuevosReportes
        });
      })
    );
  }
}