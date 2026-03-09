import { NgModule, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
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

@NgModule({
  declarations: [
    App,
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
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideFirebaseApp(() => initializeApp({ projectId: "aura-d3e5f", appId: "1:436823356091:web:406b901367e080001c6f9e", storageBucket: "aura-d3e5f.firebasestorage.app", apiKey: "AIzaSyDpURBb4fPDEVJ5om7CK7LaHjDUSOL7dpE", authDomain: "aura-d3e5f.firebaseapp.com", messagingSenderId: "436823356091", measurementId: "G-GGSMJGF5PN" })),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore())
  ],
  bootstrap: [App]
})
export class AppModule { }
