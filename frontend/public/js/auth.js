// =============================================
// SATRA - Auth Manager & Session
// =============================================

const Auth = {
  _usuario: null,
  _token: null,

  init() {
    this._token = localStorage.getItem('satra_token');
    const raw = localStorage.getItem('satra_usuario');
    try { this._usuario = raw ? JSON.parse(raw) : null; } catch { this._usuario = null; }
  },

  getToken() { return this._token; },
  getUsuario() { return this._usuario; },
  isLoggedIn() { return !!this._token && !!this._usuario; },
  getRol() { return this._usuario?.rol || null; },
  isAdmin() { return this._usuario?.rol === 'administrador'; },
  isProfesor() { return this._usuario?.rol === 'profesor'; },
  isEstudiante() { return this._usuario?.rol === 'estudiante'; },

  setSession(token, usuario) {
    this._token = token;
    this._usuario = usuario;
    localStorage.setItem('satra_token', token);
    localStorage.setItem('satra_usuario', JSON.stringify(usuario));
    // Aplicar preferencias de tema
    this.aplicarTema(usuario.tema || 'claro');
    this.aplicarTamanoTexto(usuario.tamano_texto || 'normal');
  },

  updateUsuario(data) {
    this._usuario = { ...this._usuario, ...data };
    localStorage.setItem('satra_usuario', JSON.stringify(this._usuario));
  },

  logout() {
    this._token = null;
    this._usuario = null;
    localStorage.removeItem('satra_token');
    localStorage.removeItem('satra_usuario');
    localStorage.removeItem('satra_pagina');
    if (typeof EventosRT !== 'undefined') EventosRT.disconnect();
    window.location.href = '/';
  },

  aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema === 'oscuro' ? 'oscuro' : '');
  },

  aplicarTamanoTexto(tamano) {
    document.documentElement.setAttribute('data-text-size', tamano || 'normal');
  },

  async verificarSesion() {
    if (!this._token) return false;
    try {
      const data = await authAPI.me();
      this.updateUsuario(data.usuario);
      this.aplicarTema(data.usuario.tema);
      this.aplicarTamanoTexto(data.usuario.tamano_texto);
      return true;
    } catch (err) {
      if (err.status === 401) {
        this.logout();
        return false;
      }
      return true; // Error de red, mantener sesión
    }
  },

  guardarPagina(pagina) {
    localStorage.setItem('satra_pagina', pagina);
    authAPI.actualizarPagina(pagina).catch(() => {});
  },

  getUltimaPagina() {
    return localStorage.getItem('satra_pagina') ||
           this._usuario?.ultima_pagina ||
           '/dashboard';
  }
};

// Inicializar al cargar
Auth.init();
