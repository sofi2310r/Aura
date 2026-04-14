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
import { ModeracionComponent } from '../components/moderador/moderacion/moderacion.component';
import { Layout } from '../components/moderador/moderacion/layout/layoaut';
import { Usuarios } from '../components/moderador/moderacion/usuarios/usuarios';
import { Reportes } from '../components/moderador/reportes/reporte';
import { Dashboard } from '../components/moderador/moderacion/dashboard/dashboard.component';
import { NotFoundComponent } from '../components/shared/not-found/not-found.component';
import { AuthGuard } from '../services/auth.guard';
import { QuienesSomos } from './quienes-somos/quienes-somos';
const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent },
  { path: 'quienes-somos', component: QuienesSomos },
  { path: 'foro', component: ForoComponent },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'administrador'] } },
  { path: 'admin/usuarios', component: UsuariosComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'administrador'] } },
  { path: 'admin/foro', component: ForoComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'administrador'] } },
  { path: 'psicologo', component: LayoutComponent,
    children: [
      { path: '', component: DashboardComponent },
      { path: 'citas', component: CitasComponent },
      { path: 'pacientes', component: PacientesComponent },
      { path: 'chat', component: ChatComponent },
      { path: 'foro', component: ForoComponent }
    ]
  },
  { path: 'moderador', component: Layout,
    children:[
      { path: '', component: Dashboard },
      { path: 'usuarios', component: Usuarios },
      { path: 'reportes', component: Reportes },
      { path: 'foro', component: ForoComponent }
    ]
  },
  { path: '404', component: NotFoundComponent },
  { path: '**', component: NotFoundComponent },
  { path: 'psicologo/chat', component: ChatComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
