import { Component, NgZone, ChangeDetectorRef, OnInit } from '@angular/core';
import { BackendService } from '../../services/backend.service';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/user.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
      isDragOver = false;
      /** Maneja archivos soltados en el área drag & drop */
      onDropFile(event: DragEvent): void {
        event.preventDefault();
        if (event.dataTransfer && event.dataTransfer.files.length > 0) {
          this.documentoFile = event.dataTransfer.files[0];
        }
      }
    // Archivo seleccionado para subir
    documentoFile: File | null = null;
    // Importar Supabase client
    // Asegúrate de tener el cliente de Supabase inicializado en tu proyecto
    // import { createClient } from '@supabase/supabase-js';
    // const supabase = createClient('https://<your-project>.supabase.co', 'public-anon-key');
    // Maneja el archivo seleccionado
    onFileSelected(event: any): void {
      const file = event.target.files && event.target.files[0];
      this.documentoFile = file ? file : null;
    }
  // ── Login ──
  usuario = '';
  contrasena = '';
  errorLogin = '';
  authErrorMessage = '';  exitoLogin = '';
  loginExitoso = false;
  cargandoLogin = false;

  // ── Registro ──
  nombre = '';
  apellido = '';
  documento = '';
  fechaNacimiento = '';
  telefono = '';
  correo = '';
  reporte = '';
  permisos = 'paciente'; 
  passwordReg = '';
  errorReg = '';
  exitoReg = '';
  registroExitoso = false;
  cargandoReg = false;

  // ── Estado del panel deslizante ──
  mostrarRegistro = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly backend: BackendService,
  ) {}

  ngOnInit(): void {
    const authError = this.activatedRoute.snapshot.queryParamMap.get('authError');
    if (authError) {
      this.authErrorMessage = authError;
      this.errorLogin = authError;
    }
  }

  /** Alterna entre el panel de login y el de registro */
  togglePanel(): void {
    this.mostrarRegistro = !this.mostrarRegistro;
    this.errorLogin = '';
    this.exitoLogin = '';
    this.errorReg = '';
    this.exitoReg = '';
    this.registroExitoso = false;
    this.cargandoLogin = false;
    this.cargandoReg = false;
    this.cdr.markForCheck();
  }

  async iniciarSesion(): Promise<void> {
    if (!this.usuario.trim() || !this.contrasena.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Todos los campos son obligatorios',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#9b59b6',
      });
      return;
    }

    this.cargandoLogin = true;
    this.errorLogin = '';
    this.exitoLogin = '';
    this.loginExitoso = false;

    try {
      const user = await this.authService.login(this.usuario, this.contrasena);

      if (user && user.activo === false) {
        this.cargandoLogin = false;
        const mensajeBloqueo = user.fechaDesbloqueo === 'permanente'
        ? 'Tu cuenta ha sido bloqueada permanente.'
        : `Tu cuenta está suspendida. Podrás ingresar después de: ${user.fechaDesbloqueo}`;

        Swal.fire({
          icon: 'error',
          title: 'Acceso denegado',
          text: mensajeBloqueo,
          confirmButtonColor: '#9b59b6',
        });
        return;
      }
      
      // Detener loading
      this.ngZone.run(() => {
        this.cargandoLogin = false;
        this.cdr.markForCheck();
      });

      if (!user) {
        Swal.fire({
          icon: 'error',
          title: 'Error al iniciar sesión',
          text: 'Usuario o contraseña incorrectos',
          confirmButtonText: 'Intentar de nuevo',
          confirmButtonColor: '#9b59b6',
        });
        return;
      }

      // Inicio exitoso SOLO si user existe
      Swal.fire({
        icon: 'success',
        title: '¡Bienvenido!',
        text: 'Ingresaste correctamente a AURA',
        confirmButtonText: 'Continuar',
        confirmButtonColor: '#9b59b6',
        showConfirmButton: true,
        timer: 2000,
        timerProgressBar: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => {
        this.router.navigate([this.resolveRoute(user.rol)]);
      });
    } catch (error: any) {
      this.ngZone.run(() => {
        this.cargandoLogin = false;
        this.cdr.markForCheck();
      });

      let mensaje = 'Error al iniciar sesión';
      const errorCode = error?.message || '';

      if (errorCode === 'USUARIO_NO_ENCONTRADO') {
        mensaje = 'Usuario no encontrado. Verifica tu correo electrónico';
      } else if (errorCode === 'CONTRASEÑA_INCORRECTA') {
        mensaje = 'Contraseña incorrecta. Intenta de nuevo';
      } else if (errorCode === 'CREDENCIALES_INVALIDAS') {
        mensaje = 'Credenciales inválidas';
      } else if (errorCode === 'PERFIL_NO_ENCONTRADO') {
        mensaje = 'Tu perfil no está completamente configurado';
      }

      Swal.fire({
        icon: 'error',
        title: 'Error al iniciar sesión',
        text: mensaje,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#9b59b6',
      });
    }
  }

  async registrarUsuario(): Promise<void> {
    this.errorReg = '';
    this.exitoReg = '';
    this.registroExitoso = false;

    // Validar campos obligatorios
    if (
      !this.nombre.trim() ||
      !this.apellido.trim() ||
      !this.fechaNacimiento ||
      !this.telefono || this.telefono.toString().trim() === '' ||
      !this.correo.trim() ||
      !this.passwordReg.trim()
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Todos los campos son obligatorios',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#9b59b6',
      });
      return;
    }

    if (!this.isValidEmail(this.correo)) {
      Swal.fire({
        icon: 'warning',
        title: 'Correo inválido',
        text: 'Ingresa un correo electrónico válido',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#9b59b6',
      });
      return;
    }

    if (this.passwordReg.trim().length < 4) {
      Swal.fire({
        icon: 'warning',
        title: 'Contraseña débil',
        text: 'La contraseña debe tener mínimo 4 caracteres',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#9b59b6',
      });
      return;
    }

    this.cargandoReg = true;

    try {
      // Calcular edad desde fecha de nacimiento
      const edad = this.calcularEdad(this.fechaNacimiento);
      console.log('📝 Iniciando registro...');

      // 1. Subir documento al backend (que lo sube a Supabase) - OPCIONAL
      let documentoUrl = '';
      if (this.documentoFile) {
        try {
          const destination = `documentos/${this.documento}_${Date.now()}_${this.documentoFile?.name}`;
          const response: any = await this.backend.uploadFile('/api/storage/upload', this.documentoFile!, { destination }).toPromise();
          documentoUrl = response.url || response.publicUrl || '';
          if (!documentoUrl) throw new Error('No se recibió URL del backend');
        } catch (uploadError) {
          console.error('❌ Error subiendo documento al backend:', uploadError);
          Swal.fire({
            icon: 'error',
            title: 'Error al subir documento',
            text: 'No se pudo subir el documento. Intenta de nuevo.',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#9b59b6',
          });
          this.ngZone.run(() => {
            this.cargandoReg = false;
            this.cdr.markForCheck();
          });
          return;
        }
      }

        // 2. Registrar usuario con el link del documento en documentoUrl
      const registerUid = await this.authService.register({
        nombre: this.nombre.trim(),
        apellido: this.apellido.trim(),
        correo: this.correo,
        password: this.passwordReg,
        documento: this.documento ? this.documento.toString().trim() : '',
        fechaNacimiento: this.fechaNacimiento,
        edad: edad,
        telefono: this.telefono ? this.telefono.toString().trim() : '',
        reporte: this.reporte,
        permisos: this.permisos,
        documentoUrl: documentoUrl,
      });

      console.log('✅ Respuesta recibida del backend, UID:', registerUid);

      if (!registerUid) {
        // ERROR EN EL REGISTRO - MOSTRAR ALERTA DE ERROR Y RETORNAR
        this.ngZone.run(() => {
          this.cargandoReg = false;
          this.cdr.markForCheck();
        });
        Swal.fire({
          icon: 'error',
          title: 'Error al registrarse',
          text: 'No se pudo registrar el usuario',
          confirmButtonText: 'Intentar de nuevo',
          confirmButtonColor: '#9b59b6',
        });
        console.log('❌ Error mostrado: registro fallido');
        return;
      }

      // Detener loading
      this.ngZone.run(() => {
        this.cargandoReg = false;
        this.cdr.markForCheck();
      });

      // ÉXITO EN EL REGISTRO
      console.log('✅ Registro exitoso. Mostrando alerta...');
      Swal.fire({
        icon: 'success',
        title: '¡Tu cuenta creada correctamente!',
        text: 'Bienvenido a AURA',
        confirmButtonText: 'Continuar',
        confirmButtonColor: '#9b59b6',
        showConfirmButton: true,
        timer: 3000,
        timerProgressBar: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => {
        // Limpiar campos después de que el usuario confirme o expire el timer
        this.nombre = '';
        this.apellido = '';
        this.documento = '';
        this.fechaNacimiento = '';
        this.telefono = '';
        this.correo = '';
        // this.documentoUrl = ''; // No es necesario limpiar, ya que no se usa para el documento
        this.reporte = '';
        this.permisos = 'paciente';
        this.passwordReg = '';
        this.documentoFile = null;
        // Navegar a Inicio
        this.router.navigate(['/home']);
      });
    } catch (error) {
      this.ngZone.run(() => {
        this.cargandoReg = false;
        this.cdr.markForCheck();
      });
      console.error('❌ Exception en registrarUsuario:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al registrar. Intenta de nuevo.',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#9b59b6',
      });
    }
  }

  private resolveRoute(role: UserRole): string {
    if (role === 'administrador' || role === 'admin') return '/admin';
    if (role === 'psicologo') return '/psicologo/citas';
    if (role === 'moderador') return '/moderador';
    return '/home';
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const fecha = new Date(fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const mesActual = hoy.getMonth();
    const mesNacimiento = fecha.getMonth();

    // Ajustar si el cumpleaños aún no ha llegado este año
    if (mesActual < mesNacimiento || (mesActual === mesNacimiento && hoy.getDate() < fecha.getDate())) {
      edad--;
    }

    return Math.max(0, edad);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
