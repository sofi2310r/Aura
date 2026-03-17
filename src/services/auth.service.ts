import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { BackendService, extractBackendErrorMessage } from './backend.service';
import { UserService } from './user.service';

/** Clave para almacenar el usuario actual en localStorage */
const CURRENT_USER_STORAGE_KEY = 'aura.current-user';

/**
 * Interfaz para los datos requeridos en el registro de un nuevo usuario
 */
interface RegisterRequest {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
  documento: string;
  fechaNacimiento: string;
  edad: number;
  telefono: string;
  imagenUrl?: string;
  reporte?: string;
  permisos: string;
}

/**
 * Interfaz para la respuesta del backend al registrar un usuario
 */
interface RegisterResponse {
  uid: string;
  email: string;
  displayName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  /**
   * BehaviorSubject que contiene el usuario actual autenticado.
   * Se conserva en memoria y localStorage para mantener la sesión
   * al recargar la aplicación en el navegador.
   */
  private readonly currentUserSubject = new BehaviorSubject<User | null>(this.loadStoredUser());
  
  /**
   * Observable que emite el usuario actual cada vez que cambia
   * Los componentes se suscriben a este para reaccionar a cambios de autenticación
   */
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    /** Servicio para operaciones relacionadas con usuarios */
    private readonly userService: UserService,
    
    /** Servicio para hacer llamadas HTTP al backend */
    private readonly backend: BackendService,
  ) {}

  /**
   * Obtiene el usuario actual autenticado de forma síncrona
   * @returns Usuario actual o null si no hay sesión activa
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  async login(correo: string, password: string): Promise<User | null> {
    const normalizedEmail = correo.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!normalizedEmail || trimmedPassword.length < 4) {
      return null;
    }

    try {
      // Validar email y contraseña en el backend
      try {
        await firstValueFrom(
          this.backend.post<{ uid: string }>('/api/auth/login', {
            email: normalizedEmail,
            password: trimmedPassword,
          }),
        );
      } catch (loginError: any) {
        // Si falla la validación
        if (loginError.status === 401) {
          const errorMsg = loginError.error?.error || '';
          if (errorMsg === 'Contraseña incorrecta') {
            throw new Error('CONTRASEÑA_INCORRECTA');
          }
          if (errorMsg === 'Usuario no encontrado') {
            throw new Error('USUARIO_NO_ENCONTRADO');
          }
          throw new Error('CREDENCIALES_INVALIDAS');
        }
        throw loginError;
      }

      // Si la validación fue exitosa, obtener perfil desde Firestore
      const user = await this.userService.findUserByEmail(normalizedEmail);

      if (!user) {
        throw new Error('PERFIL_NO_ENCONTRADO');
      }

      this.persistUser(user);
      return user;
    } catch (error: any) {
      const errorMsg = error?.message || '';
      console.error('Error en login:', errorMsg);
      throw error;
    }
  }

  async register(data: RegisterRequest): Promise<string | null> {
    const normalizedEmail = data.correo.trim().toLowerCase();
    const trimmedPassword = data.password.trim();

    if (trimmedPassword.length < 4) {
      return 'La contrasena debe tener al menos 4 caracteres.';
    }

    try {
      // PASO 1: Crear user en Firebase Auth
      console.log('📤 PASO 1: Creando user en Firebase Auth...');
      const createdUser = await firstValueFrom(
        this.backend.post<RegisterResponse>('/api/auth/register', {
          email: normalizedEmail,
          password: trimmedPassword,
          displayName: data.nombre.trim(),
        }),
      );
      console.log('✅ PASO 1 completado. UID:', createdUser.uid);

      // PASO 2: Preparar perfil para Firestore con todos los datos
      console.log('📝 PASO 2: Preparando perfil para Firestore...');
      const profile: Omit<User, 'id'> = {
        uid: createdUser.uid,
        nombre: data.nombre.trim(),
        apellido: data.apellido.trim(),
        correo: normalizedEmail,
        rol: this.resolveRole(data.permisos),
        role: data.permisos.trim(),
        activo: true,
        documento: data.documento.trim(),
        fechaNacimiento: data.fechaNacimiento,
        edad: data.edad,
        telefono: data.telefono.trim(),
        imagenUrl: data.imagenUrl?.trim() || '',
        reporte: data.reporte?.trim() || '',
        permisos: data.permisos.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        // PASO 3: Guardar perfil en Firestore
        console.log('💾 PASO 3: Guardando perfil en Firestore...');
        await firstValueFrom(this.userService.addUser(profile, createdUser.uid));
        console.log('✅ PASO 3 completado. Perfil guardado en Firestore');
      } catch (profileError) {
        // PASO 4: Si falla Firestore, eliminar user de Auth (rollback)
        console.error('❌ PASO 3 falló. Haciendo rollback...', profileError);
        await this.rollbackRegisteredUser(createdUser.uid);
        return extractBackendErrorMessage(profileError, 'La cuenta se creo en Auth, pero fallo el perfil. Intenta de nuevo.');
      }

      console.log('✅ REGISTRO COMPLETADO EXITOSAMENTE');
      return null;
    } catch (error) {
      console.error('❌ ERROR EN REGISTRO:', error);
      return extractBackendErrorMessage(error, 'No se pudo registrar la cuenta en el backend.');
    }
  }

  /**
   * Cierra la sesión del usuario
   * Elimina el usuario de memoria y localStorage
   */
  logout(): void {
    this.currentUserSubject.next(null);
    this.clearStoredUser();
  }

  /**
   * Convierte el valor de "permisos" del formulario a un rol válido de la aplicación
   * @param value - Valor de permisos ingresado en el formulario
   * @returns Uno de los roles válidos: 'admin', 'psicologo', 'moderador' o 'paciente'
   */
  private resolveRole(value: string): UserRole {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue.includes('admin')) {
      return 'admin';
    }

    if (normalizedValue.includes('psico')) {
      return 'psicologo';
    }

    if (normalizedValue.includes('moder')) {
      return 'moderador';
    }

    // Si no coincide con ningún rol específico, asignar rol paciente por defecto
    return 'paciente';
  }

  /**
   * Guarda el usuario actual en memoria (BehaviorSubject) y en localStorage
   * Esto permite mantener la sesión aunque se recargue la página
   */
  private persistUser(user: User): void {
    this.currentUserSubject.next(user);
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
  }

  /** Carga el usuario desde localStorage si existe */
  private loadStoredUser(): User | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const storedValue = localStorage.getItem(CURRENT_USER_STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    try {
      // Parsear el JSON almacenado
      const parsedValue = JSON.parse(storedValue) as Partial<User>;
      if (
        typeof parsedValue.id === 'string' &&
        typeof parsedValue.nombre === 'string' &&
        typeof parsedValue.correo === 'string' &&
        typeof parsedValue.rol === 'string'
      ) {
        // Retornar el usuario validado
        return {
          id: parsedValue.id,
          uid: parsedValue.uid || '',
          nombre: parsedValue.nombre,
          apellido: parsedValue.apellido || '',
          correo: parsedValue.correo,
          rol: this.resolveRole(parsedValue.rol),
          role: parsedValue.role || parsedValue.rol || '',
          activo: parsedValue.activo !== false,
          documento: parsedValue.documento || '',
          fechaNacimiento: parsedValue.fechaNacimiento || '',
          edad: parsedValue.edad || 0,
          telefono: parsedValue.telefono || '',
          imagenUrl: parsedValue.imagenUrl || '',
          reporte: parsedValue.reporte || '',
          permisos: parsedValue.permisos,
          createdAt: parsedValue.createdAt || new Date().toISOString(),
          updatedAt: parsedValue.updatedAt || new Date().toISOString(),
        };
      }
    } catch {
      this.clearStoredUser();
    }
    return null;
  }

  /**
   * Elimina el usuario almacenado en localStorage
   * Se usa cuando el usuario cierra sesión o hay datos inválidos
   */
  private clearStoredUser(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  }


  private async rollbackRegisteredUser(uid: string): Promise<void> {
    try {

      await firstValueFrom(this.backend.delete<{ message: string }>(`/api/auth/user/${encodeURIComponent(uid)}`));
    } catch {
      return;
    }
  }
}