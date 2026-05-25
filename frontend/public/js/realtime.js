// =============================================
// SATRA - Eventos en Tiempo Real (SSE)
// =============================================

const EventosRT = {
  _es: null,
  _intentos: 0,
  _maxIntentos: 5,
  _handlers: {},

  connect() {
    if (!Auth.isLoggedIn()) return;
    const usuario = Auth.getUsuario();
    const token = Auth.getToken();
    const url = `http://localhost:3001/api/eventos/${usuario.id}?token=${token}`;

    try {
      if (this._es) this._es.close();

      this._es = new EventSource(url);

      this._es.onopen = () => {
        console.log('[SATRA RT] Conectado');
        this._intentos = 0;
      };

      this._es.onmessage = (e) => {
        try {
          const evento = JSON.parse(e.data);
          this._dispatch(evento);
        } catch (err) {
          console.warn('[SATRA RT] Error parseando evento:', err);
        }
      };

      this._es.onerror = () => {
        this._es.close();
        this._intentos++;
        if (this._intentos < this._maxIntentos) {
          const delay = Math.min(1000 * Math.pow(2, this._intentos), 30000);
          console.log(`[SATRA RT] Reintentando en ${delay / 1000}s...`);
          setTimeout(() => this.connect(), delay);
        }
      };
    } catch (err) {
      console.error('[SATRA RT] Error al conectar:', err);
    }
  },

  disconnect() {
    if (this._es) {
      this._es.close();
      this._es = null;
    }
  },

  on(tipo, handler) {
    if (!this._handlers[tipo]) this._handlers[tipo] = [];
    this._handlers[tipo].push(handler);
  },

  off(tipo, handler) {
    if (!this._handlers[tipo]) return;
    this._handlers[tipo] = this._handlers[tipo].filter(h => h !== handler);
  },

  _dispatch(evento) {
    const tipo = evento.tipo;
    if (this._handlers[tipo]) {
      this._handlers[tipo].forEach(h => h(evento));
    }
    if (this._handlers['*']) {
      this._handlers['*'].forEach(h => h(evento));
    }
  }
};

// =============================================
// NOTIFICACIONES MANAGER
// =============================================
const Notificaciones = {
  _pendientes: 0,
  _lista: [],
  _panelAbierto: false,

  async init() {
    await this.cargarPendientes();
    this._registrarEventos();
    this._renderBadge();
  },

  async cargarPendientes() {
    try {
      const data = await notificacionesAPI.pendientes();
      this._pendientes = data.pendientes || 0;
      this._renderBadge();
    } catch {}
  },

  async cargarLista() {
    try {
      const data = await notificacionesAPI.listar({ limite: 30 });
      this._lista = data.notificaciones || [];
      this._pendientes = data.pendientes || 0;
      this._renderBadge();
      return this._lista;
    } catch { return []; }
  },

  _renderBadge() {
    const badge = document.getElementById('notif-badge');
    if (badge) {
      if (this._pendientes > 0) {
        badge.textContent = this._pendientes > 99 ? '99+' : this._pendientes;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  },

  _registrarEventos() {
    EventosRT.on('nueva_notificacion', (evento) => {
      const notif = evento.notificacion;
      this._pendientes++;
      this._lista.unshift(notif);
      this._renderBadge();

      // Toast para alerta de riesgo
      if (notif.tipo === 'riesgo_academico') {
        Toast.warning(`⚠ ${notif.titulo}: ${notif.mensaje}`, 6000);
      } else {
        Toast.info(notif.titulo, 3500);
      }
    });
  },

  async togglePanel() {
    if (this._panelAbierto) {
      this.cerrarPanel();
    } else {
      await this.abrirPanel();
    }
  },

  async abrirPanel() {
    // Cerrar si ya existe
    document.getElementById('notif-panel')?.remove();
    this._panelAbierto = true;

    const lista = await this.cargarLista();
    const panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.className = 'notif-panel';

    const itemsHTML = lista.length === 0
      ? '<div class="empty-state" style="padding:32px 16px"><p>Sin notificaciones</p></div>'
      : lista.map(n => `
          <div class="notif-item ${!n.leida ? 'unread' : ''}" data-id="${n.id}" data-leida="${n.leida}">
            ${!n.leida ? '<span class="notif-dot"></span>' : '<span style="width:8px;flex-shrink:0"></span>'}
            <div class="notif-content">
              <div class="notif-title">${Helpers.sanitize(n.titulo)}</div>
              <div class="notif-msg">${Helpers.sanitize(n.mensaje)}</div>
              <div class="notif-time">${Helpers.formatTiempoRelativo(n.created_at)}</div>
            </div>
          </div>
        `).join('');

    panel.innerHTML = `
      <div class="notif-panel-header">
        <span style="font-weight:600;font-size:.95rem">Notificaciones</span>
        <button class="btn btn-ghost btn-sm" id="btn-leer-todas">Leer todas</button>
      </div>
      <div class="notif-list">${itemsHTML}</div>
    `;

    // Posicionar relativo al botón
    const btnNotif = document.getElementById('btn-notif');
    if (btnNotif) {
      btnNotif.closest('.topbar-right').style.position = 'relative';
      btnNotif.closest('.topbar-right').appendChild(panel);
    } else {
      document.body.appendChild(panel);
    }

    // Eventos
    panel.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        if (item.dataset.leida === 'false') {
          notificacionesAPI.leer(id).then(() => {
            item.classList.remove('unread');
            item.dataset.leida = 'true';
            item.querySelector('.notif-dot')?.remove();
            this._pendientes = Math.max(0, this._pendientes - 1);
            this._renderBadge();
          }).catch(() => {});
        }
      });
    });

    panel.querySelector('#btn-leer-todas')?.addEventListener('click', async () => {
      await notificacionesAPI.leerTodas();
      this._pendientes = 0;
      this._renderBadge();
      this.cerrarPanel();
      Toast.success('Todas las notificaciones marcadas como leídas');
    });

    // Cerrar al hacer click fuera
    setTimeout(() => {
      document.addEventListener('click', this._clickFuera.bind(this), { once: true });
    }, 100);
  },

  _clickFuera(e) {
    const panel = document.getElementById('notif-panel');
    const btn = document.getElementById('btn-notif');
    if (panel && !panel.contains(e.target) && e.target !== btn) {
      this.cerrarPanel();
    } else if (this._panelAbierto) {
      document.addEventListener('click', this._clickFuera.bind(this), { once: true });
    }
  },

  cerrarPanel() {
    document.getElementById('notif-panel')?.remove();
    this._panelAbierto = false;
  }
};