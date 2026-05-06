import { NgModule, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from '../components/auth/login.component';
import { HomeComponent } from '../components/home/home.component';
import { ForoComponent } from '../components/home/foro/foro.component';
import { ModeracionComponent } from '../components/moderador/moderacion/moderacion.component';
import { NavbarComponent } from '../components/home/navbar/navbar.component';
import { FooterComponent } from '../components/home/footer/footer.component';
import { NotFoundComponent } from '../components/shared/not-found/not-found.component';
import { SessionTimeoutService } from '../services/session-timeout.service';
import { Header } from '../components/shared/header/header';
import { SlicePipe } from '@angular/common';
import { Layout } from '../components/moderador/moderacion/layout/layoaut';
import { Usuarios } from '../components/moderador/moderacion/usuarios/usuarios';
import { Reportes } from '../components/moderador/reportes/reporte';
import { ChatComponent } from '../components/psicologo/chat/chat.component';
import { LayoutComponent } from '../components/psicologo/layout/layout';
import { CitasComponent } from '../components/psicologo/citas/citas.component';
import { PacientesComponent } from '../components/psicologo/pacientes/pacientes.component';
import { NotasClinicasComponent } from '../components/notas-clinicas/notas-clinicas.component';
import { RouterModule } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular'
import { Dashboard } from '../components/moderador/moderacion/dashboard/dashboard.component';
import { QuienesSomos } from './quienes-somos/quienes-somos';
import { NavbarPsicologoComponent } from '../components/shared/navbar-psicologo/navbar-psicologo.component';
import { NavbarAdminComponent } from '../components/shared/navbar-admin/navbar-admin.component';
import { AuthTokenInterceptor } from '../services/auth-token.interceptor';
import { DashboardComponent } from '../components/psicologo/dashboard/dashboard';

@NgModule({
  declarations: [
    App,
    LoginComponent,
    HomeComponent,
    ForoComponent,
    ModeracionComponent,
    NavbarComponent,
    FooterComponent,
    NotFoundComponent,
    Header,
    ChatComponent,
    LayoutComponent,
    CitasComponent,
    PacientesComponent,
    DashboardComponent,
    Layout,
    Reportes,
    Usuarios,
    Dashboard,
    QuienesSomos
  ],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule,
    SlicePipe,
    RouterModule,
    FullCalendarModule,
    NavbarPsicologoComponent,
    NavbarAdminComponent,
    NotasClinicasComponent,
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    SessionTimeoutService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthTokenInterceptor,
      multi: true,
    },
  ],
  bootstrap: [App]
})
export class AppModule { }
