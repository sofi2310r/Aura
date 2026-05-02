import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatComponent } from '../components/psicologo/chat/chat.component';
import { CitasComponent } from '../components/psicologo/citas/citas.component';
import { DashboardComponent } from '../components/psicologo/dashboard/dashboard';
import { LayoutComponent } from '../components/psicologo/layout/layout';
import { PacientesComponent } from '../components/psicologo/pacientes/pacientes.component';
import { LoginComponent } from '../components/auth/login.component';
import { HomeComponent } from '../components/home/home.component';
import { ForoComponent } from '../components/home/foro/foro.component';
import { AdminDashboardComponent } from '../components/admin/admin-dashboard/admin-dashboard.component';
import { UsuariosComponent } from '../components/admin/usuarios/usuarios.component';
import { Layout as ModeradorLayout } from '../components/moderador/moderacion/layout/layoaut';
import { Usuarios as ModeradorUsuarios } from '../components/moderador/moderacion/usuarios/usuarios';
import { Reportes } from '../components/moderador/reportes/reporte';
import { Dashboard as ModeradorDashboard } from '../components/moderador/moderacion/dashboard/dashboard.component';
import { NotFoundComponent } from '../components/shared/not-found/not-found.component';
import { NotasClinicasComponent } from '../components/notas-clinicas/notas-clinicas.component';
import { AuthGuard } from '../services/auth.guard';
import { QuienesSomos } from './quienes-somos/quienes-somos';

const routes: Routes = [
  // 1. Redirección inicial (Dejar siempre al inicio)
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // 2. Rutas públicas
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent },
  { path: 'quienes-somos', component: QuienesSomos },

  // 3. Módulo de Administrador
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [AuthGuard],
    data: { roles: ['admin', 'administrador'] },
    children: [
      { path: '', component: UsuariosComponent }, // Cambiado a vacío para cargar algo por defecto
      { path: 'usuarios', component: UsuariosComponent },
      { path: 'foro', component: ForoComponent },
      { path: 'notas-clinicas', component: NotasClinicasComponent },
    ]
  },

  // 4. Módulo de Psicólogo
  {
    path: 'psicologo',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    data: { roles: ['psicologo'] },
    children: [
      { path: '', component: DashboardComponent },
      { path: 'citas', component: CitasComponent },
      { path: 'pacientes', component: PacientesComponent },
      { path: 'chat', component: ChatComponent },
      { path: 'notas-clinicas', component: NotasClinicasComponent },
      { path: 'foro', component: ForoComponent }
    ]
  },

  // 5. Módulo de Moderador
  {
    path: 'moderador',
    component: ModeradorLayout,
    canActivate: [AuthGuard],
    data: { roles: ['moderador'] },
    children: [
      { path: '', component: ModeradorDashboard },
      { path: 'usuarios', component: ModeradorUsuarios },
      { path: 'reportes', component: Reportes },
      { path: 'notas-clinicas', component: NotasClinicasComponent },
      { path: 'foro', component: ForoComponent }
    ]
  },

  // 6. Rutas compartidas protegidas
  { path: 'foro', component: ForoComponent, canActivate: [AuthGuard] },
  { path: 'notas-clinicas', component: NotasClinicasComponent, canActivate: [AuthGuard] },

  // 7. Manejo de errores (ORDEN CRÍTICO)
  { path: '404', component: NotFoundComponent },
  { path: '**', redirectTo: '404' } // Forzamos la redirección al path '404'
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    useHash: false,
    scrollPositionRestoration: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }