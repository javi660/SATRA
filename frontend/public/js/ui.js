// =============================================
// SATRA - UI Utilities
// =============================================

// =============================================
// TOAST NOTIFICATIONS
// =============================================
const Toast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.id = 'toast-container';
      this._container.style.cssText = `
        position: fixed; bottom: 24px; right: 24px;
        z-index: 9999; display: flex; flex-direction: column;
        gap: 8px; pointer-events: none;
      `;
      document.body.appendChild(this._container);
    }
    return this._container;
  },

  show(mensaje, tipo = 'info', duracion = 3500) {
    const container = this._getContainer();
    const iconos = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const colores = {
      success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: var(--bg-card); border: 1px solid var(--border);
      border-left: 4px solid ${colores[tipo]};
      border-radius: 8px; padding: 12px 16px;
      box-shadow: var(--shadow-lg); display: flex; align-items: flex-start; gap: 10px;
      min-width: 280px; max-width: 380px; pointer-events: auto;
      animation: slideUp 0.2s ease; font-family: var(--font); font-size: 0.875rem;
      color: var(--text-primary);
    `;
    toast.innerHTML = `
      <span style="color:${colores[tipo]};font-weight:700;flex-shrink:0;font-size:1rem;">${iconos[tipo]}</span>
      <span style="flex:1;line-height:1.4;">${mensaje}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeIn 0.2s ease reverse';
      setTimeout(() => toast.remove(), 200);
    }, duracion);
  },

  success: (msg, dur) => Toast.show(msg, 'success', dur),
  error: (msg, dur) => Toast.show(msg, 'error', dur || 5000),
  warning: (msg, dur) => Toast.show(msg, 'warning', dur),
  info: (msg, dur) => Toast.show(msg, 'info', dur)
};

// =============================================
// MODAL
// =============================================
const Modal = {
  _stack: [],

  open(opciones) {
    const {
      titulo = '',
      contenido = '',
      tamano = '',
      botones = [],
      onClose = null
    } = opciones;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = `modal ${tamano}`;

    const botonesHTML = botones.map(b =>
      `<button class="btn ${b.clase || 'btn-secondary'}" data-action="${b.accion || ''}" ${b.id ? `id="${b.id}"` : ''}>${b.texto}</button>`
    ).join('');

    modal.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${titulo}</h3>
        <button class="btn-close" data-close>✕</button>
      </div>
      <div class="modal-body">${contenido}</div>
      ${botones.length ? `<div class="modal-footer">${botonesHTML}</div>` : ''}
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';
    this._stack.push({ backdrop, onClose });

    const cerrar = () => this.closeTop();

    backdrop.querySelector('[data-close]').addEventListener('click', cerrar);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) cerrar(); });

    // Asignar acciones a botones
    modal.querySelectorAll('[data-action]').forEach(btn => {
      const accion = btn.dataset.action;
      const def = botones.find(b => b.accion === accion);
      if (def?.onClick) btn.addEventListener('click', (e) => def.onClick(e, modal, cerrar));
    });

    return { modal, cerrar };
  },

  closeTop() {
    const last = this._stack.pop();
    if (!last) return;
    last.backdrop.remove();
    if (this._stack.length === 0) document.body.style.overflow = '';
    if (last.onClose) last.onClose();
  },

  closeAll() {
    while (this._stack.length) this.closeTop();
  },

  confirm(mensaje, titulo = 'Confirmar') {
    return new Promise((resolve) => {
      this.open({
        titulo,
        contenido: `<p style="color:var(--text-primary)">${mensaje}</p>`,
        botones: [
          {
            texto: 'Cancelar', clase: 'btn-secondary', accion: 'cancelar',
            onClick: (e, m, cerrar) => { cerrar(); resolve(false); }
          },
          {
            texto: 'Confirmar', clase: 'btn-danger', accion: 'confirmar',
            onClick: (e, m, cerrar) => { cerrar(); resolve(true); }
          }
        ],
        onClose: () => resolve(false)
      });
    });
  }
};

// =============================================
// HELPERS
// =============================================
const Helpers = {
  formatFecha(iso, opciones = {}) {
    if (!iso) return 'Sin fecha';
    const d = new Date(iso);
    const defOpts = { day: '2-digit', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('es-CO', { ...defOpts, ...opciones });
  },

  formatFechaHora(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  formatTiempoRelativo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const dias = Math.floor(hrs / 24);

    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}m`;
    if (hrs < 24) return `Hace ${hrs}h`;
    if (dias < 7) return `Hace ${dias}d`;
    return this.formatFecha(iso);
  },

  formatNota(valor) {
    if (valor === null || valor === undefined) return '-';
    return parseFloat(valor).toFixed(1);
  },

  clasePromedio(valor) {
    if (valor >= 4.5) return 'excelente';
    if (valor >= 3.5) return 'bueno';
    if (valor >= 3.0) return 'riesgo';
    return 'critico';
  },

  colorBarraPromedio(valor) {
    if (valor >= 4.5) return '#22c55e';
    if (valor >= 3.5) return '#3b82f6';
    if (valor >= 3.0) return '#f59e0b';
    return '#ef4444';
  },

  porcentajePromedio(valor) {
    return Math.min(100, (valor / 5) * 100);
  },

  badgeRol(rol) {
    const map = {
      administrador: 'badge-red',
      profesor: 'badge-blue',
      estudiante: 'badge-green'
    };
    return `<span class="badge ${map[rol] || 'badge-gray'}">${rol}</span>`;
  },

  badgeEstadoEntrega(entrega, tarea) {
    if (!entrega || entrega.no_entrego) {
      return '<span class="badge badge-gray">No se entregó</span>';
    }
    if (entrega.tardio) {
      return '<span class="badge badge-yellow">Entrega tardía</span>';
    }
    return '<span class="badge badge-green">Entregado</span>';
  },

  badgeAsistencia(estado) {
    const map = {
      presente: 'badge-green',
      ausente: 'badge-red',
      excusa: 'badge-yellow'
    };
    return `<span class="badge ${map[estado] || 'badge-gray'}">${estado || '-'}</span>`;
  },

  iconoTarea(tipo) {
    const map = { actividad: '📝', parcial: '📋', quiz: '❓', proyecto: '🏗️' };
    return map[tipo] || '📄';
  },

  colorTarea(tipo) {
    const map = {
      actividad: 'background:var(--accent-light);color:var(--accent)',
      parcial: 'background:var(--warning-light);color:var(--warning)',
      quiz: 'background:var(--info-light);color:var(--info)',
      proyecto: 'background:var(--success-light);color:var(--success)'
    };
    return map[tipo] || '';
  },

  fechaVencida(fechaLimite) {
    if (!fechaLimite) return false;
    return new Date() > new Date(fechaLimite);
  },

  setLoading(btn, loading, textoOriginal) {
    if (loading) {
      btn.disabled = true;
      btn.dataset.original = btn.innerHTML;
      btn.innerHTML = '<span class="spinner"></span> Procesando...';
    } else {
      btn.disabled = false;
      btn.innerHTML = textoOriginal || btn.dataset.original || btn.innerHTML;
    }
  },

  sanitize(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  },

  getNombreCompleto(u) {
    if (!u) return 'Usuario';
    return `${u.nombre || ''} ${u.apellido || ''}`.trim();
  },

  renderPromedioDisplay(valor) {
    const clase = this.clasePromedio(valor);
    const pct = this.porcentajePromedio(valor);
    const color = this.colorBarraPromedio(valor);
    return `
      <div class="promedio-display">
        <span class="promedio-valor ${clase}">${parseFloat(valor).toFixed(2)}</span>
        <div class="promedio-barra">
          <div class="promedio-barra-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="text-muted text-xs">/ 5.0</span>
      </div>
    `;
  }
};

// =============================================
// FORMULARIO HELPERS
// =============================================
const Form = {
  getData(formEl) {
    const data = {};
    new FormData(formEl).forEach((val, key) => { data[key] = val; });
    return data;
  },

  showError(inputEl, mensaje) {
    const errEl = inputEl.parentElement.querySelector('.form-error');
    if (errEl) { errEl.textContent = mensaje; errEl.style.display = 'block'; }
    inputEl.style.borderColor = 'var(--danger)';
  },

  clearErrors(formEl) {
    formEl.querySelectorAll('.form-error').forEach(e => { e.textContent = ''; e.style.display = 'none'; });
    formEl.querySelectorAll('.form-control').forEach(e => { e.style.borderColor = ''; });
  }
};
