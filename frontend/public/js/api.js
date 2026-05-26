// =============================================
// SATRA - API Client
// =============================================

const API_URL = 'https://satra-backend.up.railway.app/api';

const api = {
  _getToken() {
    return localStorage.getItem('satra_token');
  },

  _headers(isFormData = false) {
    const h = { Authorization: `Bearer ${this._getToken()}` };
    if (!isFormData) h['Content-Type'] = 'application/json';
    return h;
  },

  async _handleResponse(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `Error ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  },

  async get(path) {
    const res = await fetch(`${API_URL}${path}`, {
      headers: this._headers()
    });
    return this._handleResponse(res);
  },

  async post(path, body) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body)
    });
    return this._handleResponse(res);
  },

  async postForm(path, formData) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this._getToken()}` },
      body: formData
    });
    return this._handleResponse(res);
  },

  async put(path, body) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: this._headers(),
      body: JSON.stringify(body)
    });
    return this._handleResponse(res);
  },

  async putForm(path, formData) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${this._getToken()}` },
      body: formData
    });
    return this._handleResponse(res);
  },

  async delete(path) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: this._headers()
    });
    return this._handleResponse(res);
  }
};

// =============================================
// AUTH
// =============================================
const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  registro: (data) => api.post('/auth/registro', data),
  me: () => api.get('/auth/me'),
  recuperar: (email) => api.post('/auth/recuperar-password', { email }),
  resetear: (data) => api.post('/auth/resetear-password', data),
  cambiarPassword: (data) => api.put('/auth/cambiar-password', data),
  configuracion: (data) => api.put('/auth/configuracion', data),
  actualizarPagina: (pagina) => api.put('/auth/actualizar-pagina', { pagina })
};

// =============================================
// USUARIOS
// =============================================
const usuariosAPI = {
  listar: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/usuarios${q ? '?' + q : ''}`);
  },
  obtener: (id) => api.get(`/usuarios/${id}`),
  crear: (data) => api.post('/usuarios', data),
  actualizar: (id, data) => api.put(`/usuarios/${id}`, data),
  desactivar: (id) => api.delete(`/usuarios/${id}`),   // elimina completamente
  eliminar: (id) => api.delete(`/usuarios/${id}`),     // alias explícito
  profesores: () => api.get('/usuarios/profesores/lista')
};

// =============================================
// CLASES
// =============================================
const clasesAPI = {
  listar: () => api.get('/clases'),
  disponibles: () => api.get('/clases/disponibles'),
  obtener: (id) => api.get(`/clases/${id}`),
  estudiantes: (id) => api.get(`/clases/${id}/estudiantes`),
  crear: (data) => api.post('/clases', data),
  actualizar: (id, data) => api.put(`/clases/${id}`, data),
  eliminar: (id) => api.delete(`/clases/${id}`)
};

// =============================================
// MATRÍCULAS
// =============================================
const matriculasAPI = {
  misClases: () => api.get('/matriculas/mis-clases'),
  matricularse: (clase_id) => api.post('/matriculas', { clase_id }),
  matricularEstudiante: (data) => api.post('/matriculas/admin', data),
  cancelar: (id) => api.delete(`/matriculas/${id}`)
};

// =============================================
// TAREAS
// =============================================
const tareasAPI = {
  deClase: (clase_id) => api.get(`/tareas/clase/${clase_id}`),
  obtener: (id) => api.get(`/tareas/${id}`),
  crear: (formData) => api.postForm('/tareas', formData),
  actualizar: (id, formData) => api.putForm(`/tareas/${id}`, formData),
  eliminar: (id) => api.delete(`/tareas/${id}`)
};

// =============================================
// ENTREGAS
// =============================================
const entregasAPI = {
  deTarea: (tarea_id) => api.get(`/entregas/tarea/${tarea_id}`),
  crear: (formData) => api.postForm('/entregas', formData),
  actualizar: (id, formData) => api.putForm(`/entregas/${id}`, formData)
};

// =============================================
// NOTAS
// =============================================
const notasAPI = {
  deClase: (clase_id) => api.get(`/notas/clase/${clase_id}`),
  deEstudiante: (clase_id, estudiante_id) => api.get(`/notas/clase/${clase_id}/estudiante/${estudiante_id}`),
  crear: (data) => api.post('/notas', data),
  actualizar: (id, data) => api.put(`/notas/${id}`, data),
  eliminar: (id) => api.delete(`/notas/${id}`)
};

// =============================================
// ASISTENCIA
// =============================================
const asistenciaAPI = {
  deClase: (clase_id, fecha) => api.get(`/asistencia/clase/${clase_id}${fecha ? '?fecha=' + fecha : ''}`),
  deEstudiante: (clase_id, est_id) => api.get(`/asistencia/clase/${clase_id}/estudiante/${est_id}`),
  fechas: (clase_id) => api.get(`/asistencia/fechas/${clase_id}`),
  registrar: (data) => api.post('/asistencia', data),
  masiva: (data) => api.post('/asistencia/masiva', data)
};

// =============================================
// COMENTARIOS
// =============================================
const comentariosAPI = {
  deEntrega: (entrega_id) => api.get(`/comentarios/entrega/${entrega_id}`),
  crear: (data) => api.post('/comentarios', data),
  editar: (id, contenido) => api.put(`/comentarios/${id}`, { contenido }),
  eliminar: (id) => api.delete(`/comentarios/${id}`)
};

// =============================================
// NOTIFICACIONES
// =============================================
const notificacionesAPI = {
  listar: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/notificaciones${q ? '?' + q : ''}`);
  },
  pendientes: () => api.get('/notificaciones/pendientes-count'),
  leer: (id) => api.put(`/notificaciones/${id}/leer`, {}),
  leerTodas: () => api.put('/notificaciones/leer-todas', {}),
  eliminar: (id) => api.delete(`/notificaciones/${id}`)
};
