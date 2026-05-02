import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { finalize, map } from 'rxjs';
import { User } from '../../../models/user.model';
import { AuthService } from '../../../services/auth.service';
import { ChatConversation, ChatMessage, ChatService } from '../../../services/chat.service';
import { UserService } from '../../../services/user.service';

@Component({
    selector: 'app-chat',
    standalone: false,
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.css'
}) 
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesViewport') private messagesViewport?: ElementRef<HTMLDivElement>;

  chats: ChatConversation[] = [];
  usuariosUsuario: User[] = [];
  usuarioBusqueda = '';
  mostrarPanelNuevoChat = false;
  creandoChat = false;
  chatSeleccionado: ChatConversation | null = null;
  authError = '';
  errorMessage = '';

  mensajes: ChatMessage[] = [];

  // Detectar cambios en mensajes y hacer scroll abajo automáticamente
  ngAfterViewChecked(): void {
    this.scrollToBottom(true);
  }
  nuevoMensaje: string = '';
  cargando = false;
  enviando = false;

  miUid: string = '';
  miDocumento: string = '';
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private readonly refreshIntervalMs = 5000;
  private detailRequestSeq = 0;
  private lastLoadedChatSignature: string | null = null;
  private userPinnedToBottom = true;
  readonly fallbackChatTitle = 'Paciente sin nombre';
  readonly fallbackUserLabel = 'Usuario sin nombre';

  // Formatea la hora a mostrar en cada mensaje
  getHora(fechaIso: string): string {
    if (!fechaIso) return '';
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) return '';
    return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.miUid = user?.uid || '';
    this.miDocumento = user?.documento || '';

    console.log('[Chat Psicologo] Sesion detectada', {
      uid: this.miUid,
      documento: this.miDocumento,
      tieneToken: !!this.authService.getAuthToken(),
    });

    if (!this.miDocumento) {
      this.authError = 'No se encontró documento del psicólogo en el perfil.';
      this.scheduleViewUpdate();
      return;
    }

    this.cargarChats();
    this.cargarUsuariosDisponibles();

    this.refreshTimer = setInterval(() => {
      this.cargarChats(false);
      if (this.chatSeleccionado) {
        this.cargarDetalleChat(this.chatSeleccionado.id, false);
      }
    }, this.refreshIntervalMs);
  }

  ngOnDestroy(): void {
    this.clearRefreshTimer();
  }

  seleccionarChat(chat: ChatConversation): void {
    this.chatSeleccionado = chat;
    this.mostrarPanelNuevoChat = false;
    this.mensajes = [];
    this.lastLoadedChatSignature = null;
    this.userPinnedToBottom = true;
    this.cargarDetalleChat(chat.id);
  }

  private cargarChats(showLoader = true): void {
    if (!this.miDocumento) {
      this.chats = [];
      this.authError = 'No se encontró documento del psicólogo en el perfil.';
      this.scheduleViewUpdate();
      return;
    }

    this.authError = '';
    if (showLoader) {
      this.errorMessage = '';
    }

    if (showLoader) {
      this.cargando = true;
    }

    this.chatService
      .getChatsByPsicologo(this.miDocumento)
      .subscribe({
        next: (chats) => {
          this.chats = chats;
          this.cargando = false;
          console.log('[Chat Psicologo] Chats cargados:', chats.length);

          const firstValidChat = chats.find((chat) => !!chat?.id);

          if (!this.chatSeleccionado && firstValidChat) {
            this.seleccionarChat(firstValidChat);
            return;
          }

          if (this.chatSeleccionado) {
            const selected = chats.find((c) => c.id === this.chatSeleccionado?.id);
            if (selected) {
              this.chatSeleccionado = selected;
            } else if (firstValidChat) {
              this.seleccionarChat(firstValidChat);
            }
          }

          if (!firstValidChat && chats.length > 0) {
            this.errorMessage = 'Los chats se cargaron, pero llegaron sin identificador válido.';
          }

          this.scheduleViewUpdate();
        },
        error: (error) => {
          this.cargando = false;
          this.errorMessage = 'No se pudieron actualizar los chats. Reintentando...';
          console.error('[Chat Psicologo] Error cargando listado de chats', error);
          this.scheduleViewUpdate();
        },
      });
  }

  private cargarDetalleChat(chatId: string, showLoader = true): void {
    if (!chatId) {
      this.mensajes = [];
      return;
    }

    const requestSeq = ++this.detailRequestSeq;

    if (showLoader) {
      this.cargando = true;
    }

    this.chatService.getChatById(chatId)
      .pipe(
        finalize(() => {
          // Solo el request vigente puede apagar el loader.
          if (requestSeq === this.detailRequestSeq && this.chatSeleccionado?.id === chatId) {
            this.cargando = false;
          }
        })
      )
      .subscribe({
        next: (chat) => {
          // Ignorar respuestas viejas o de otro chat para evitar mezclar mensajes.
          if (requestSeq !== this.detailRequestSeq || this.chatSeleccionado?.id !== chatId) {
            return;
          }

          const mergedMessages = this.deduplicateMessages(chat.Mensajes);
          const mergedSignature = this.buildChatSignature({ ...chat, Mensajes: mergedMessages });
          const wasNearBottom = this.isNearBottom();

          if (mergedSignature === this.lastLoadedChatSignature) {
            return;
          }

          this.chatSeleccionado = { ...this.chatSeleccionado, ...chat, id: chatId };
          this.mensajes = mergedMessages;
          this.lastLoadedChatSignature = mergedSignature;
          console.log('[Chat Psicologo] Conversacion abierta', {
            chatId: chat.id,
            mensajes: mergedMessages.length,
          });

          // Siempre hacer scroll abajo cuando llegan mensajes nuevos
          this.queueScrollToBottom(true);

          this.scheduleViewUpdate();
        },
        error: (error) => {
          this.errorMessage = 'No se pudo abrir la conversación seleccionada.';
          console.error('[Chat Psicologo] Error cargando detalle del chat', error);
          this.scheduleViewUpdate();
        },
      });
  }

  enviarMensaje(): void {
    const texto = this.nuevoMensaje.trim();
    if (this.enviando || !texto || !this.chatSeleccionado) {
      return;
    }

    const targetChatId = this.chatSeleccionado.id;

    this.nuevoMensaje = '';

    this.enviando = true;
    this.chatService.sendMessage({
      chatId: targetChatId,
      autor: 'psicologo',
      autorUid: this.miUid,
      texto,
    }).subscribe({
      next: (conversation) => {
        const mergedMessages = this.deduplicateMessages(conversation.Mensajes);

        if (this.chatSeleccionado?.id === targetChatId) {
          this.mensajes = mergedMessages;
          this.chatSeleccionado = {
            ...this.chatSeleccionado,
            Mensaje: texto,
            Mensajes: mergedMessages,
            updatedAt: new Date().toISOString(),
          };
          this.lastLoadedChatSignature = this.buildChatSignature(this.chatSeleccionado);
        }

        this.chats = this.chats.map((chat) =>
          chat.id === targetChatId
            ? {
                ...chat,
                Mensaje: texto,
                Mensajes: mergedMessages,
                updatedAt: new Date().toISOString(),
              }
            : chat,
        );
        this.enviando = false;
        console.log('[Chat Psicologo] Mensaje enviado', {
          chatId: targetChatId,
          totalMensajes: mergedMessages.length,
        });

        this.userPinnedToBottom = true;
        this.queueScrollToBottom(true);
        this.scheduleViewUpdate();
      },
      error: (error) => {
        this.nuevoMensaje = texto;
        this.enviando = false;
        this.errorMessage = 'No se pudo enviar el mensaje. Intenta de nuevo.';
        console.error('[Chat Psicologo] Error enviando mensaje', error);
        this.scheduleViewUpdate();
      }
    });
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  getChatTitle(chat: ChatConversation): string {
    const title = (chat.nombre_usuario || chat.Documento_usuario || '').toString().trim();
    if (title) {
      return title;
    }

    const chatId = (chat.id || '').toString();
    return chatId ? `Chat ${chatId.slice(0, 6)}` : this.fallbackChatTitle;
  }

  getChatMeta(chat: ChatConversation): string {
    const motivo = (chat.Motivo || '').toString().trim() || 'Sin motivo';
    const categoria = (chat.Categoria || '').toString().trim() || 'General';
    return `${motivo} · ${categoria}`;
  }

  getChatPreview(chat: ChatConversation): string {
    const preview = (chat.Mensaje || '').toString().trim();
    return preview || 'Sin mensajes por ahora';
  }

  trackByChatId(index: number, chat: ChatConversation): string {
    return chat.id || `chat-${index}`;
  }

  get usuariosFiltrados(): User[] {
    const term = this.usuarioBusqueda.trim().toLowerCase();

    if (!term) {
      return this.usuariosUsuario;
    }

    return this.usuariosUsuario.filter((user) => {
      const nombre = (user.nombre || '').toLowerCase();
      const documento = (user.documento || '').toLowerCase();
      const correo = (user.correo || '').toLowerCase();
      return nombre.includes(term) || documento.includes(term) || correo.includes(term);
    });
  }

  togglePanelNuevoChat(): void {
    this.mostrarPanelNuevoChat = !this.mostrarPanelNuevoChat;
    if (!this.mostrarPanelNuevoChat) {
      this.usuarioBusqueda = '';
    }
    this.scheduleViewUpdate();
  }

  crearChatConUsuario(usuario: User): void {
    const documentoUsuario = (usuario.documento || '').trim();

    if (!documentoUsuario || !this.miDocumento || this.creandoChat) {
      return;
    }

    this.creandoChat = true;
    this.errorMessage = '';

    const psicologoNombre = this.getPsicologoNombre();

    this.chatService
      .createChat({
        documentoUsuario,
        documentoPsicologo: this.miDocumento,
        nombreUsuario: usuario.nombre,
        nombrePsicologo: psicologoNombre,
      })
      .subscribe({
        next: (chat) => {
          this.creandoChat = false;
          this.mostrarPanelNuevoChat = false;
          this.usuarioBusqueda = '';
          this.upsertChatInList(chat);
          this.seleccionarChat(chat);
          this.scheduleViewUpdate();
        },
        error: (error) => {
          this.creandoChat = false;
          this.errorMessage = 'No se pudo crear el chat con ese usuario.';
          console.error('[Chat Psicologo] Error creando chat', error);
          this.scheduleViewUpdate();
        },
      });
  }

  getUserDisplayName(user: User): string {
    const nombre = (user.nombre || '').trim();
    return nombre || this.fallbackUserLabel;
  }

  onMessagesScroll(): void {
    this.userPinnedToBottom = this.isNearBottom();
  }

  private buildChatSignature(chat: ChatConversation): string {
    const lastMessage = chat.Mensajes.at(-1);

    return [
      chat.id || '',
      chat.updatedAt || '',
      chat.Mensaje || '',
      chat.Motivo || '',
      chat.Categoria || '',
      String(chat.Mensajes.length),
      lastMessage?.fecha || '',
      lastMessage?.texto || '',
      lastMessage?.autorUid || '',
    ].join('|');
  }

  private deduplicateMessages(messages: ChatMessage[]): ChatMessage[] {
    const seenExact = new Set<string>();
    const merged: ChatMessage[] = [];

    for (const message of messages) {
      const exactKey = this.messageKey(message);
      if (seenExact.has(exactKey)) {
        continue;
      }

      const currentTs = this.parseMessageTimestamp(message.fecha);
      const currentAuthor = this.normalizeAuthor(message);
      const currentText = this.normalizeText(message.texto);

      const isNearDuplicate = merged.some((existing) => {
        const existingTs = this.parseMessageTimestamp(existing.fecha);
        const existingAuthor = this.normalizeAuthor(existing);
        const existingText = this.normalizeText(existing.texto);

        const sameText = existingText === currentText;
        const sameAuthor =
          existingAuthor === currentAuthor ||
          (!existing.autorUid && !message.autorUid &&
            this.normalizeText(existing.autor) === this.normalizeText(message.autor));

        const closeInTime = Number.isFinite(existingTs) && Number.isFinite(currentTs)
          ? Math.abs(existingTs - currentTs) <= 15000
          : false;

        const fallbackSameSecond = !Number.isFinite(existingTs) || !Number.isFinite(currentTs)
          ? this.normalizeFechaKey(existing.fecha) === this.normalizeFechaKey(message.fecha)
          : false;

        return sameAuthor && sameText && (closeInTime || fallbackSameSecond);
      });

      if (!isNearDuplicate) {
        seenExact.add(exactKey);
        merged.push(message);
      }
    }

    merged.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    return merged;
  }

  private messageKey(message: ChatMessage): string {
    return [
      this.normalizeText(message.autor),
      this.normalizeText(message.autorUid),
      this.normalizeFechaKey(message.fecha),
      this.normalizeText(message.texto),
    ].join('|');
  }

  private normalizeText(value: string | undefined): string {
    return String(value || '').trim().toLowerCase();
  }

  private normalizeAuthor(message: ChatMessage): string {
    return this.normalizeText(message.autorUid || message.autor);
  }

  private normalizeFechaKey(value: string | undefined): string {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }

    // Keep stable second-level key even when backend sends microseconds.
    return raw.replace(/\.\d+/, '').replace(/Z$/, '');
  }

  private parseMessageTimestamp(value: string | undefined): number {
    const raw = String(value || '').trim();
    if (!raw) {
      return Number.NaN;
    }

    const direct = Date.parse(raw);
    if (Number.isFinite(direct)) {
      return direct;
    }

    const withMsTrimmed = raw.replace(/\.(\d{3})\d+/, '.$1');
    const withZone = /Z$|[+-]\d{2}:?\d{2}$/.test(withMsTrimmed) ? withMsTrimmed : `${withMsTrimmed}Z`;
    const normalized = Date.parse(withZone);
    return Number.isFinite(normalized) ? normalized : Number.NaN;
  }

  private scheduleViewUpdate(): void {
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  private cargarUsuariosDisponibles(): void {
    this.userService.getUsers().pipe(
      map((users) =>
        users
          .filter((user) => ['usuario', 'paciente'].includes(user.rol || ''))
          .filter((user) => !!(user.documento || '').trim()),
      ),
    ).subscribe((users) => {
      this.usuariosUsuario = users.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
      this.scheduleViewUpdate();
    });
  }

  private getPsicologoNombre(): string {
    const user = this.authService.getCurrentUser();
    return (user?.nombre || '').trim();
  }

  private upsertChatInList(chat: ChatConversation): void {
    const exists = this.chats.some((item) => item.id === chat.id);
    const next = exists
      ? this.chats.map((item) => (item.id === chat.id ? { ...item, ...chat } : item))
      : [chat, ...this.chats];

    this.chats = next.sort((a, b) =>
      new Date(b.updatedAt || b.Fecha_inicio || 0).getTime() -
      new Date(a.updatedAt || a.Fecha_inicio || 0).getTime(),
    );
  }

  private queueScrollToBottom(force = false): void {
    setTimeout(() => {
      this.scrollToBottom(force);
      // Segundo intento tras un pequeño delay para asegurar renderizado completo
      setTimeout(() => this.scrollToBottom(force), 80);
    }, 0);
  }

  private scrollToBottom(force = false): void {
    const viewport = this.messagesViewport?.nativeElement;
    if (!viewport) {
      return;
    }

    if (force || this.isNearBottom()) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }

  private isNearBottom(threshold = 80): boolean {
    const viewport = this.messagesViewport?.nativeElement;
    if (!viewport) {
      return true;
    }

    const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    return distance <= threshold;
  }
}