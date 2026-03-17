import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from '../components/auth/login.component';
import { HomeComponent } from '../components/home/home.component';
import { ForoComponent } from '../components/home/foro/foro.component';
import { AdminDashboardComponent } from '../components/admin/admin-dashboard/admin-dashboard.component';
import { UsuariosComponent } from '../components/admin/usuarios/usuarios.component';
import { CitasComponent } from '../components/psicologo/citas/citas.component';
import { PacientesComponent } from '../components/psicologo/pacientes/pacientes.component';
import { ModeracionComponent } from '../components/moderador/moderacion/moderacion.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent },
  { path: 'foro', component: ForoComponent },
  { path: 'admin', component: AdminDashboardComponent },
  { path: 'admin/usuarios', component: UsuariosComponent },
  { path: 'psicologo/citas', component: CitasComponent },
  { path: 'psicologo/pacientes', component: PacientesComponent },
  { path: 'moderador', component: ModeracionComponent },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
