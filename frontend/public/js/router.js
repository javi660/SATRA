// =============================================
// SATRA - Router & Layout
// =============================================

const Router = {
  _rutas: {},
  _rutaActual: null,
  _layoutMontado: false,

  registrar(ruta, handler) {
    this._rutas[ruta] = handler;
  },

  async navegar(ruta, guardaPagina = true) {
    if (!Auth.isLoggedIn()) {
      this.mostrarLogin();
      return;
    }

    const handler = this._rutas[ruta];
    if (!handler) {
      this.navegar('/dashboard');
      return;
    }

    // Actualizar nav activo
    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.toggle('active', el.dataset.ruta === ruta);
    });

    this._rutaActual = ruta;
    if (guardaPagina) Auth.guardarPagina(ruta);

    const container = document.getElementById('page-container');
    if (container) {
      container.innerHTML = '<div class="loading-overlay" style="position:relative;min-height:200px;background:transparent"><span class="spinner spinner-dark"></span></div>';
    }

    try {
      await handler();
    } catch (err) {
      console.error('Error en ruta:', ruta, err);
      if (container) container.innerHTML = `<div class="empty-state"><p>Error al cargar la página. <a href="#" onclick="Router.navegar('${ruta}')">Reintentar</a></p></div>`;
    }
  },

  getRutaActual() { return this._rutaActual; },

  mostrarLogin() {
    document.body.innerHTML = '';
    const div = document.createElement('div');
    div.id = 'login-root';
    document.body.appendChild(div);
    if (typeof renderLogin === 'function') renderLogin();
  },

  montarLayout() {
    if (this._layoutMontado) return;
    this._layoutMontado = true;

    const usuario = Auth.getUsuario();
    const navItems = this._buildNav(usuario.rol);

    document.body.innerHTML = `
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div id="app-layout">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-logo">
            <img src="/assets/logo.png" alt="SATRA" onerror="this.style.display='none'">
          </div>
          <div class="sidebar-user">
            <div class="user-name">${Helpers.sanitize(Helpers.getNombreCompleto(usuario))}</div>
            <div class="user-role">${usuario.rol}</div>
          </div>
          <nav class="sidebar-nav" id="sidebar-nav">
            ${navItems}
          </nav>
        </aside>

        <div class="main-content">
          <header class="topbar">
            <div class="topbar-left">
              <button class="hamburger" id="hamburger">☰</button>
              <span class="topbar-title" id="topbar-title">SATRA</span>
            </div>
            <div class="topbar-right" style="position:relative">
              <button class="btn-notif" id="btn-notif" title="Notificaciones">
                🔔
                <span class="notif-badge" id="notif-badge" style="display:none">0</span>
              </button>
              <button class="btn btn-ghost btn-sm" id="btn-configuracion" title="Configuración">⚙</button>
            </div>
          </header>

          <main class="page-content">
            <div id="page-container"></div>
          </main>
        </div>
      </div>
    `;

    // Eventos sidebar
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    hamburger?.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });

    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });

    // Navegación por links del sidebar
    document.querySelectorAll('.nav-link[data-ruta]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const ruta = link.dataset.ruta;
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        this.navegar(ruta);
      });
    });

    // Logout
    document.querySelectorAll('[data-action="logout"]').forEach(el => {
      el.addEventListener('click', () => {
        if (confirm('¿Cerrar sesión?')) Auth.logout();
      });
    });

    // Notificaciones
    document.getElementById('btn-notif')?.addEventListener('click', (e) => {
      e.stopPropagation();
      Notificaciones.togglePanel();
    });

    // Configuración
    document.getElementById('btn-configuracion')?.addEventListener('click', () => {
      this.navegar('/configuracion');
    });
  },

  _buildNav(rol) {
    const sections = {
      estudiante: `
        <div class="nav-section">Principal</div>
        <a class="nav-link" data-ruta="/dashboard"><span class="icon">🏠</span> Inicio</a>
        <a class="nav-link" data-ruta="/mis-clases"><span class="icon">📚</span> Mis Clases</a>
        <a class="nav-link" data-ruta="/mis-tareas"><span class="icon">📝</span> Tareas</a>
        <a class="nav-link" data-ruta="/mis-notas"><span class="icon">🎯</span> Mis Notas</a>
        <a class="nav-link" data-ruta="/mi-asistencia"><span class="icon">📅</span> Asistencia</a>
        <div class="nav-section">Cuenta</div>
        <a class="nav-link" data-ruta="/configuracion"><span class="icon">⚙</span> Configuración</a>
        <a class="nav-link" data-action="logout"><span class="icon">🚪</span> Cerrar Sesión</a>
      `,
      profesor: `
        <div class="nav-section">Principal</div>
        <a class="nav-link" data-ruta="/dashboard"><span class="icon">🏠</span> Inicio</a>
        <a class="nav-link" data-ruta="/mis-clases"><span class="icon">📚</span> Mis Clases</a>
        <a class="nav-link" data-ruta="/tareas-profesor"><span class="icon">📝</span> Tareas</a>
        <a class="nav-link" data-ruta="/calificaciones"><span class="icon">🎯</span> Calificaciones</a>
        <a class="nav-link" data-ruta="/asistencia-profesor"><span class="icon">📅</span> Asistencia</a>
        <a class="nav-link" data-ruta="/alertas"><span class="icon">⚠</span> Alertas Académicas</a>
        <div class="nav-section">Cuenta</div>
        <a class="nav-link" data-ruta="/configuracion"><span class="icon">⚙</span> Configuración</a>
        <a class="nav-link" data-action="logout"><span class="icon">🚪</span> Cerrar Sesión</a>
      `,
      administrador: `
        <div class="nav-section">Principal</div>
        <a class="nav-link" data-ruta="/dashboard"><span class="icon">🏠</span> Inicio</a>
        <div class="nav-section">Gestión</div>
        <a class="nav-link" data-ruta="/usuarios"><span class="icon">👥</span> Usuarios</a>
        <a class="nav-link" data-ruta="/clases-admin"><span class="icon">📚</span> Clases</a>
        <a class="nav-link" data-ruta="/matriculas-admin"><span class="icon">📋</span> Matrículas</a>
        <a class="nav-link" data-ruta="/alertas"><span class="icon">⚠</span> Alertas</a>
        <div class="nav-section">Cuenta</div>
        <a class="nav-link" data-ruta="/configuracion"><span class="icon">⚙</span> Configuración</a>
        <a class="nav-link" data-action="logout"><span class="icon">🚪</span> Cerrar Sesión</a>
      `
    };
    return sections[rol] || sections.estudiante;
  },

  setTitle(titulo) {
    document.title = `${titulo} | SATRA`;
    const el = document.getElementById('topbar-title');
    if (el) el.textContent = titulo;
  }
};
