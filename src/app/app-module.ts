import { NgModule, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
<<<<<<< HEAD
import { HttpClientModule } from '@angular/common/http';
=======
>>>>>>> d89e316e627d09751f793627f31196d069cb7534
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
<<<<<<< HEAD
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
import { PacientesComponent } from '../components/admin/pacientes/pacientes.component';
import { RouterModule } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular'
import { Dashboard } from '../components/moderador/moderacion/dashboard/dashboard.component';
import { QuienesSomos } from './quienes-somos/quienes-somos';
=======
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InicioSesion } from './inicio-sesion/inicio-sesion';
import { Registro } from './registro/registro';
import { Navbar } from './components/navbar/navbar';
import { Hero } from './components/hero/hero';
import { Features } from './components/features/features';
import { Empowerment } from './components/empowerment/empowerment';
import { Home } from './pages/home/home';
import { FooterBanner } from './components/footer-banner/footer-banner';
import { Foro } from './pages/foro/foro';
import { ListaPublicaciones } from './components/foro/lista-publicaciones/lista-publicaciones';
import { NuevaPublicacion } from './components/foro/nueva-publicacion/nueva-publicacion';
import { DetallePublicacion } from './components/foro/detalle-publicacion/detalle-publicacion';
import { AvisoNormas } from './components/foro/aviso-normas/aviso-normas';
>>>>>>> d89e316e627d09751f793627f31196d069cb7534

@NgModule({
  declarations: [
    App,
<<<<<<< HEAD
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
=======
    InicioSesion,
    Registro,
    Navbar,
    Hero,
    Features,
    Empowerment,
    Home,
    FooterBanner,
    Foro,
    ListaPublicaciones,
    NuevaPublicacion,
    DetallePublicacion,
    AvisoNormas
  ],
  imports: [
    BrowserModule,
    AppRoutingModule, 
    CommonModule,
    FormsModule,
>>>>>>> d89e316e627d09751f793627f31196d069cb7534
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
<<<<<<< HEAD
    SessionTimeoutService,
=======
    provideFirebaseApp(() => initializeApp({ projectId: "aura-d3e5f", appId: "1:436823356091:web:406b901367e080001c6f9e", storageBucket: "aura-d3e5f.firebasestorage.app", apiKey: "AIzaSyDpURBb4fPDEVJ5om7CK7LaHjDUSOL7dpE", authDomain: "aura-d3e5f.firebaseapp.com", messagingSenderId: "436823356091", measurementId: "G-GGSMJGF5PN" })),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore())
>>>>>>> d89e316e627d09751f793627f31196d069cb7534
  ],
  bootstrap: [App]
})
export class AppModule { }
