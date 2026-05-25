// =============================================
// SATRA - Gestión de Clases
// =============================================

async function renderMisClases() {
  Router.setTitle('Mis Clases');
  const container = document.getElementById('page-container');

  if (Auth.isEstudiante()) {
    await renderClasesEstudiante(container);
  } else if (Auth.isProfesor()) {
    await renderClasesProfesor(container);
  }
}

// ─── ESTUDIANTE ────────────────────────────────────────
async function renderClasesEstudiante(container) {
  try {
    const data = await matriculasAPI.misClases();
    const matriculas = data.matriculas || [];
    const clases = matriculas.map(m => ({ ...m.clase, matricula_id: m.id })).filter(Boolean);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Mis Materias</h1>
          <p class="page-subtitle">${clases.length} materia(s) activas</p>
        </div>
        <button class="btn btn-primary" id="btn-matricularse">+ Matricularme</button>
      </div>
      <div class="grid-auto" id="clases-grid">
        ${clases.length === 0
          ? '<div class="empty-state"><div class="empty-icon">📚</div><h3>Sin materias</h3><p>Aún no estás matriculado. Haz clic en "Matricularme" para unirte a una materia.</p></div>'
          : clases.map(c => renderClaseCardEstudiante(c)).join('')}
      </div>
    `;

    // Matricularse
    document.getElementById('btn-matricularse')?.addEventListener('click', () => {
      abrirModalMatricula();
    });

    // Click en tarjeta → ver detalle
    document.querySelectorAll('.clase-card[data-id]').forEach(card => {
      card.addEventListener('click', () => {
        sessionStorage.setItem('clase_actual', card.dataset.id);
        renderDetalleClaseEstudiante(container, card.dataset.id);
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function renderClaseCardEstudiante(c) {
  return `
    <div class="clase-card" data-id="${c.id}">
      <span class="clase-card-code">${Helpers.sanitize(c.codigo)}</span>
      <div class="clase-card-name">${Helpers.sanitize(c.nombre)}</div>
      <div class="clase-card-prof">Profesor: ${c.profesor ? Helpers.sanitize(Helpers.getNombreCompleto(c.profesor)) : 'Sin asignar'}</div>
      <div style="margin-top:10px;font-size:.78rem;color:var(--text-muted)">
        ${c.creditos} créditos · ${c.semestre || 'N/A'}
      </div>
    </div>
  `;
}

async function renderDetalleClaseEstudiante(container, clase_id) {
  try {
    const [claseData, tareasData, notasData, asistenciaData] = await Promise.all([
      clasesAPI.obtener(clase_id),
      tareasAPI.deClase(clase_id),
      notasAPI.deEstudiante(clase_id, Auth.getUsuario().id),
      asistenciaAPI.deEstudiante(clase_id, Auth.getUsuario().id)
    ]);

    const clase = claseData.clase;
    const tareas = tareasData.tareas || [];
    const notas = notasData.notas || [];
    const promedio = notasData.promedio || 0;
    const asistencia = asistenciaData.estadisticas || {};

    container.innerHTML = `
      <div class="page-header">
        <div>
          <button class="btn btn-ghost btn-sm" onclick="renderMisClases()">← Volver</button>
          <h1 class="page-title mt-2">${Helpers.sanitize(clase.nombre)}</h1>
          <p class="page-subtitle">${Helpers.sanitize(clase.codigo)} · ${clase.profesor ? Helpers.getNombreCompleto(clase.profesor) : 'Sin profesor'}</p>
        </div>
      </div>

      ${parseFloat(promedio) <= 2.9 && parseFloat(promedio) > 0 ? `
        <div class="alerta-riesgo mb-4">
          <strong>⚠ En riesgo académico</strong>
          <p style="font-size:.875rem;margin-top:4px">Tu promedio de <strong>${parseFloat(promedio).toFixed(2)}</strong> está por debajo del mínimo aprobatorio. Comunícate con tu docente.</p>
        </div>
      ` : ''}

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon ${parseFloat(promedio) <= 2.9 ? 'red' : 'green'}">🎯</div>
          <div><div class="stat-value">${parseFloat(promedio).toFixed(2)}</div><div class="stat-label">Promedio</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">✅</div>
          <div><div class="stat-value">${asistencia.porcentaje || 0}%</div><div class="stat-label">Asistencia</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow">📝</div>
          <div><div class="stat-value">${tareas.filter(t => t.entrega).length}/${tareas.length}</div><div class="stat-label">Tareas entregadas</div></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><span class="card-title">Tareas pendientes</span></div>
          <div class="card-body" style="padding:0">
            ${tareas.length === 0
              ? '<div class="empty-state" style="padding:24px"><p>Sin tareas publicadas</p></div>'
              : tareas.map(t => `
                  <div class="tarea-item" style="padding:14px 20px">
                    <div class="tarea-tipo-icon" style="${Helpers.colorTarea(t.tipo)}">${Helpers.iconoTarea(t.tipo)}</div>
                    <div class="tarea-info">
                      <div class="tarea-title">${Helpers.sanitize(t.titulo)}</div>
                      <div class="tarea-meta">
                        <span>${t.tipo} · ${t.porcentaje}%</span>
                        <span>${t.fecha_limite ? Helpers.formatFechaHora(t.fecha_limite) : 'Sin límite'}</span>
                      </div>
                    </div>
                    <div>
                      ${t.entrega ? Helpers.badgeEstadoEntrega(t.entrega) : '<span class="badge badge-gray">Sin entregar</span>'}
                    </div>
                  </div>
                `).join('')
            }
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Mis Notas</span></div>
          <div class="card-body" style="padding:0">
            ${notas.length === 0
              ? '<div class="empty-state" style="padding:24px"><p>Sin notas registradas</p></div>'
              : `<div class="table-wrapper"><table>
                  <thead><tr><th>Tipo</th><th>Nota</th><th>Fecha</th></tr></thead>
                  <tbody>
                    ${notas.map(n => `
                      <tr>
                        <td>${n.tarea ? Helpers.sanitize(n.tarea.titulo) : n.tipo}</td>
                        <td><strong style="font-family:var(--font-mono)">${parseFloat(n.valor).toFixed(1)}</strong></td>
                        <td class="text-xs text-muted">${Helpers.formatFecha(n.created_at)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table></div>`
            }
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function abrirModalMatricula() {
  try {
    const data = await clasesAPI.disponibles();
    const clases = data.clases || [];

    const contenido = clases.length === 0
      ? '<p class="text-muted">No hay materias disponibles para matricularse.</p>'
      : `<div style="display:flex;flex-direction:column;gap:8px">
          ${clases.map(c => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg)">
              <div>
                <div style="font-weight:600">${Helpers.sanitize(c.nombre)}</div>
                <div class="text-xs text-muted">${Helpers.sanitize(c.codigo)} · ${c.profesor ? Helpers.getNombreCompleto(c.profesor) : 'Sin profesor'}</div>
              </div>
              <button class="btn btn-primary btn-sm btn-matricular" data-id="${c.id}" data-nombre="${Helpers.sanitize(c.nombre)}">
                Matricular
              </button>
            </div>
          `).join('')}
        </div>`;

    const { modal, cerrar } = Modal.open({
      titulo: 'Matricularse en una materia',
      contenido,
      tamano: 'modal-lg'
    });

    modal.querySelectorAll('.btn-matricular').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        Helpers.setLoading(btn, true);
        try {
          await matriculasAPI.matricularse(id);
          Toast.success(`Matriculado en ${btn.dataset.nombre}`);
          cerrar();
          await renderMisClases();
        } catch (err) {
          Toast.error(err.message);
          Helpers.setLoading(btn, false, 'Matricular');
        }
      });
    });
  } catch (err) {
    Toast.error(err.message);
  }
}

// ─── PROFESOR ──────────────────────────────────────────
async function renderClasesProfesor(container) {
  try {
    const data = await clasesAPI.listar();
    const clases = data.clases || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Mis Materias</h1>
          <p class="page-subtitle">${clases.length} materia(s) asignadas</p>
        </div>
      </div>
      <div class="grid-auto">
        ${clases.length === 0
          ? '<div class="empty-state"><div class="empty-icon">📚</div><h3>Sin materias asignadas</h3><p>El administrador debe asignarte materias.</p></div>'
          : clases.map(c => `
              <div class="clase-card" data-id="${c.id}" style="cursor:pointer">
                <span class="clase-card-code">${Helpers.sanitize(c.codigo)}</span>
                <div class="clase-card-name">${Helpers.sanitize(c.nombre)}</div>
                <div class="clase-card-prof">${c.semestre || ''} · ${c.creditos} créditos</div>
              </div>
            `).join('')}
      </div>
    `;

    document.querySelectorAll('.clase-card[data-id]').forEach(card => {
      card.addEventListener('click', () => {
        sessionStorage.setItem('clase_actual', card.dataset.id);
        renderDetalleClaseProfesor(container, card.dataset.id);
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function renderDetalleClaseProfesor(container, clase_id) {
  try {
    const [claseData, estudiantesData, tareasData] = await Promise.all([
      clasesAPI.obtener(clase_id),
      clasesAPI.estudiantes(clase_id),
      tareasAPI.deClase(clase_id)
    ]);

    const clase = claseData.clase;
    const estudiantes = (estudiantesData.estudiantes || []).map(e => e.estudiante);
    const tareas = tareasData.tareas || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <button class="btn btn-ghost btn-sm" onclick="renderClasesProfesor(document.getElementById('page-container'))">← Volver</button>
          <h1 class="page-title mt-2">${Helpers.sanitize(clase.nombre)}</h1>
          <p class="page-subtitle">${Helpers.sanitize(clase.codigo)}</p>
        </div>
        <button class="btn btn-primary" id="btn-nueva-tarea">+ Nueva tarea</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">👥</div>
          <div><div class="stat-value">${estudiantes.length}</div><div class="stat-label">Estudiantes</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow">📝</div>
          <div><div class="stat-value">${tareas.length}</div><div class="stat-label">Tareas publicadas</div></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Tareas</span>
          </div>
          <div class="card-body" style="padding:0" id="tareas-lista">
            ${tareas.length === 0
              ? '<div class="empty-state" style="padding:24px"><p>Sin tareas. Crea la primera.</p></div>'
              : tareas.map(t => `
                  <div class="tarea-item" style="padding:14px 20px">
                    <div class="tarea-tipo-icon" style="${Helpers.colorTarea(t.tipo)}">${Helpers.iconoTarea(t.tipo)}</div>
                    <div class="tarea-info">
                      <div class="tarea-title">${Helpers.sanitize(t.titulo)}</div>
                      <div class="tarea-meta">
                        <span>${t.tipo} · ${t.porcentaje}%</span>
                        <span>${t.fecha_limite ? Helpers.formatFechaHora(t.fecha_limite) : 'Sin límite'}</span>
                      </div>
                    </div>
                    <div style="display:flex;gap:6px">
                      <button class="btn btn-secondary btn-sm" onclick="verEntregasTarea('${t.id}','${clase_id}')">Entregas</button>
                      <button class="btn btn-ghost btn-sm" onclick="editarTarea('${t.id}','${clase_id}')">✎</button>
                      <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="eliminarTarea('${t.id}','${clase_id}')">✕</button>
                    </div>
                  </div>
                `).join('')
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Estudiantes</span>
          </div>
          <div class="card-body" style="padding:0">
            ${estudiantes.length === 0
              ? '<div class="empty-state" style="padding:24px"><p>Sin estudiantes matriculados</p></div>'
              : `<div class="table-wrapper"><table>
                  <thead><tr><th>Nombre</th><th>Código</th><th>Notas</th></tr></thead>
                  <tbody>
                    ${estudiantes.map(e => `
                      <tr>
                        <td>${Helpers.sanitize(Helpers.getNombreCompleto(e))}</td>
                        <td class="text-xs text-muted">${Helpers.sanitize(e.codigo_estudiantil || '-')}</td>
                        <td>
                          <button class="btn btn-secondary btn-sm" onclick="verNotasEstudiante('${clase_id}','${e.id}','${Helpers.sanitize(Helpers.getNombreCompleto(e))}')">
                            Ver notas
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table></div>`
            }
          </div>
        </div>
      </div>
    `;

    // Botón nueva tarea
    document.getElementById('btn-nueva-tarea')?.addEventListener('click', () => {
      modalCrearTarea(clase_id, () => renderDetalleClaseProfesor(container, clase_id));
    });
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ─── ADMIN ──────────────────────────────────────────────
async function renderClasesAdmin() {
  Router.setTitle('Clases');
  const container = document.getElementById('page-container');

  try {
    const [clasesData, profesoresData] = await Promise.all([
      clasesAPI.listar(),
      usuariosAPI.profesores()
    ]);
    const clases = clasesData.clases || [];
    const profesores = profesoresData.profesores || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Gestión de Clases</h1>
          <p class="page-subtitle">${clases.length} clase(s) en total</p>
        </div>
        <button class="btn btn-primary" id="btn-nueva-clase">+ Nueva clase</button>
      </div>

      <div class="card">
        <div class="card-body" style="padding:0">
          <div class="table-wrapper"><table>
            <thead><tr>
              <th>Clase</th><th>Código</th><th>Profesor</th><th>Semestre</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              ${clases.map(c => `
                <tr>
                  <td><strong>${Helpers.sanitize(c.nombre)}</strong></td>
                  <td style="font-family:var(--font-mono);font-size:.8rem">${Helpers.sanitize(c.codigo)}</td>
                  <td>${c.profesor ? Helpers.sanitize(Helpers.getNombreCompleto(c.profesor)) : '<span class="text-muted">Sin asignar</span>'}</td>
                  <td>${Helpers.sanitize(c.semestre || '-')}</td>
                  <td>${c.activa ? '<span class="badge badge-green">Activa</span>' : '<span class="badge badge-gray">Inactiva</span>'}</td>
                  <td>
                    <div style="display:flex;gap:6px">
                      <button class="btn btn-secondary btn-sm" onclick="editarClaseAdmin('${c.id}')">Editar</button>
                      <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="eliminarClaseAdmin('${c.id}','${Helpers.sanitize(c.nombre)}')">Eliminar</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>
        </div>
      </div>
    `;

    document.getElementById('btn-nueva-clase')?.addEventListener('click', () => {
      modalClaseAdmin(null, profesores, () => renderClasesAdmin());
    });
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function editarClaseAdmin(id) {
  const [claseData, profesoresData] = await Promise.all([
    clasesAPI.obtener(id),
    usuariosAPI.profesores()
  ]);
  modalClaseAdmin(claseData.clase, profesoresData.profesores, () => renderClasesAdmin());
}

async function eliminarClaseAdmin(id, nombre) {
  const ok = await Modal.confirm(`¿Desactivar la clase "${nombre}"?`, 'Desactivar clase');
  if (!ok) return;
  try {
    await clasesAPI.eliminar(id);
    Toast.success('Clase desactivada');
    await renderClasesAdmin();
  } catch (err) {
    Toast.error(err.message);
  }
}

function modalClaseAdmin(clase, profesores, onSuccess) {
  const es_edicion = !!clase;
  const { modal, cerrar } = Modal.open({
    titulo: es_edicion ? 'Editar clase' : 'Nueva clase',
    tamano: 'modal-lg',
    contenido: `
      <form id="form-clase">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nombre <span class="required">*</span></label>
            <input name="nombre" class="form-control" value="${clase ? Helpers.sanitize(clase.nombre) : ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Código <span class="required">*</span></label>
            <input name="codigo" class="form-control" value="${clase ? Helpers.sanitize(clase.codigo) : ''}" ${es_edicion ? 'readonly' : ''} required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Descripción</label>
          <textarea name="descripcion" class="form-control">${clase ? Helpers.sanitize(clase.descripcion || '') : ''}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Profesor</label>
            <select name="profesor_id" class="form-control">
              <option value="">Sin asignar</option>
              ${profesores.map(p => `<option value="${p.id}" ${clase?.profesor_id === p.id ? 'selected' : ''}>${Helpers.sanitize(Helpers.getNombreCompleto(p))}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Créditos</label>
            <input name="creditos" type="number" class="form-control" value="${clase?.creditos || 3}" min="1" max="10">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Semestre</label>
            <input name="semestre" class="form-control" value="${clase?.semestre || ''}" placeholder="Ej: 2024-1">
          </div>
          <div class="form-group">
            <label class="form-label">Año</label>
            <input name="anio" type="number" class="form-control" value="${clase?.anio || new Date().getFullYear()}">
          </div>
        </div>
        <div id="form-error" class="alert alert-error hidden"></div>
      </form>
    `,
    botones: [
      { texto: 'Cancelar', clase: 'btn-secondary', accion: 'cancelar', onClick: (e, m, cerrar) => cerrar() },
      { texto: es_edicion ? 'Guardar' : 'Crear clase', clase: 'btn-primary', accion: 'guardar', id: 'btn-guardar-clase',
        onClick: async (e, modal, cerrar) => {
          const btn = modal.querySelector('#btn-guardar-clase');
          const form = modal.querySelector('#form-clase');
          const errEl = modal.querySelector('#form-error');
          const data = Form.getData(form);
          if (!data.nombre || (!es_edicion && !data.codigo)) {
            errEl.textContent = 'Nombre y código son obligatorios';
            errEl.classList.remove('hidden');
            return;
          }
          Helpers.setLoading(btn, true);
          try {
            if (es_edicion) await clasesAPI.actualizar(clase.id, data);
            else await clasesAPI.crear(data);
            Toast.success(es_edicion ? 'Clase actualizada' : 'Clase creada');
            cerrar();
            if (onSuccess) await onSuccess();
          } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
            Helpers.setLoading(btn, false, es_edicion ? 'Guardar' : 'Crear clase');
          }
        }
      }
    ]
  });
}
