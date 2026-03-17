import { NgModule, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from '../components/auth/login.component';
import { HomeComponent } from '../components/home/home.component';
import { ForoComponent } from '../components/home/foro/foro.component';
import { CitasComponent } from '../components/psicologo/citas/citas.component';
import { PacientesComponent } from '../components/psicologo/pacientes/pacientes.component';
import { ModeracionComponent } from '../components/moderador/moderacion/moderacion.component';
import { NavbarComponent } from '../components/home/navbar/navbar.component';
import { FooterComponent } from '../components/home/footer/footer.component';

@NgModule({
  declarations: [
    App,
    LoginComponent,
    HomeComponent,
    ForoComponent,
    CitasComponent,
    PacientesComponent,
    ModeracionComponent,
    NavbarComponent,
    FooterComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    CommonModule,
    FormsModule,
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
  ],
  bootstrap: [App]
})
export class AppModule { }
