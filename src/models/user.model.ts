export type UserRole = 'admin' | 'administrador' | 'psicologo' | 'moderador' | 'paciente' | 'usuario';

export interface User {
  id: string;
  uid: string;
  nombre: string;
  apellido: string;
  correo: string;
  rol: UserRole;
  role?: string;
  activo: boolean;
  documento?: string;
  fechaNacimiento?: string;
  edad?: number;
  telefono?: string;
  documentoUrl?: string;
  reporte?: number;
  bloqueado?: boolean;
  permisos?: string;
  createdAt?: string;
  updatedAt?: string;
  fechaDesbloqueo?: string;
  contadorReportes?: number;
}