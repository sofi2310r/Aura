import { Component, OnInit } from '@angular/core';
import { UserService} from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-chat',
    standalone: false,
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.css'
}) 
export class ChatComponent implements OnInit {
    pacientes: any[] = [];
  usuarioSeleccionado: any = null;

  mensajes: any[] = [];
  nuevoMensaje: string = '';

  miUid: string = '';

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.miUid = user?.uid || '';

    this.userService.getUsers().subscribe(users => {
      this.pacientes = users.filter(u => u.rol === 'paciente');
    });
  }

  seleccionarUsuario(user: any) {
    this.usuarioSeleccionado = user;

    // 🔥 TEMPORAL (luego lo conectamos a Firebase)
    this.mensajes = [
      { texto: 'Hola 👋', emisor: user.uid },
      { texto: '¿Cómo estás?', emisor: this.miUid }
    ];
  }

  enviarMensaje() {
    if (!this.nuevoMensaje.trim()) return;

    this.mensajes.push({
      texto: this.nuevoMensaje,
      emisor: this.miUid
    });

    this.nuevoMensaje = '';
  }
}