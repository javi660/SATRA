// =============================================
// SATRA - Tareas y Entregas
// =============================================

function modalCrearTarea(clase_id, onSuccess) {
  const { modal, cerrar } = Modal.open({
    titulo: 'Crear tarea',
    tamano: 'modal-lg',
    contenido: `
      <form id="form-tarea" enctype="multipart/form-data">
        <div class="form-group">
          <label class="form-label">Título <span class="required">*</span></label>
          <input name="titulo" class="form-control" required placeholder="Ej: Parcial 1 - Unidad 1">
        </div>
        <div class="form-group">
          <label class="form-label">Descripción</label>
          <textarea name="descripcion" class="form-control" placeholder="Instrucciones, criterios de evaluación..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tipo <span class="required">*</span></label>
            <select name="tipo" class="form-control" required>
              <option value="">Seleccionar</option>
              <option value="actividad">Actividad (40%)</option>
              <option value="parcial">Parcial (40%)</option>
              <option value="quiz">Quiz</option>
              <option value="proyecto">Proyecto</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Porcentaje en el tipo <span class="required">*</span></label>
            <input name="porcentaje" type="number" class="form-control" min="0" max="100" step="0.5" required placeholder="Ej: 25">
            <div class="form-hint">Porcentaje dentro de actividades/parciales</div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Fecha límite</label>
            <input name="fecha_limite" type="datetime-local" class="form-control">
          </div>
          <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:18px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.875rem">
              <input type="checkbox" name="bloquear_entrega" value="true"> Bloquear entregas al vencer plazo
            </label>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Archivo adjunto (opcional)</label>
          <input type="file" name="archivo" class="form-control" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.jpg,.png">
          <div class="form-hint">Máx. 10MB. PDF, Word, Excel, imágenes, ZIP</div>
        </div>
        <input type="hidden" name="clase_id" value="${clase_id}">
        <div id="tarea-error" class="alert alert-error hidden"></div>
      </form>
    `,
    botones: [
      { texto: 'Cancelar', clase: 'btn-secondary', accion: 'cancelar', onClick: (e,m,c) => c() },
      {
        texto: 'Crear tarea', clase: 'btn-primary', accion: 'crear', id: 'btn-crear-tarea',
        onClick: async (e, modal, cerrar) => {
          const btn = modal.querySelector('#btn-crear-tarea');
          const form = modal.querySelector('#form-tarea');
          const errEl = modal.querySelector('#tarea-error');
          const fd = new FormData(form);
          if (!fd.get('titulo') || !fd.get('tipo') || !fd.get('porcentaje')) {
            errEl.textContent = 'Título, tipo y porcentaje son obligatorios';
            errEl.classList.remove('hidden');
            return;
          }
          Helpers.setLoading(btn, true);
          try {
            await tareasAPI.crear(fd);
            Toast.success('Tarea creada y notificaciones enviadas a estudiantes');
            cerrar();
            if (onSuccess) await onSuccess();
          } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
            Helpers.setLoading(btn, false, 'Crear tarea');
          }
        }
      }
    ]
  });
}

async function editarTarea(tarea_id, clase_id) {
  const data = await tareasAPI.obtener(tarea_id);
  const t = data.tarea;
  const fechaLimite = t.fecha_limite ? new Date(t.fecha_limite).toISOString().slice(0,16) : '';

  const { modal, cerrar } = Modal.open({
    titulo: 'Editar tarea',
    tamano: 'modal-lg',
    contenido: `
      <form id="form-editar-tarea">
        <div class="form-group">
          <label class="form-label">Título</label>
          <input name="titulo" class="form-control" value="${Helpers.sanitize(t.titulo)}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Descripción</label>
          <textarea name="descripcion" class="form-control">${Helpers.sanitize(t.descripcion || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Porcentaje</label>
            <input name="porcentaje" type="number" class="form-control" value="${t.porcentaje}" min="0" max="100">
          </div>
          <div class="form-group">
            <label class="form-label">Fecha límite</label>
            <input name="fecha_limite" type="datetime-local" class="form-control" value="${fechaLimite}">
          </div>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;font-size:.875rem;cursor:pointer">
            <input type="checkbox" name="bloquear_entrega" value="true" ${t.bloquear_entrega ? 'checked' : ''}> Bloquear entregas al vencer plazo
          </label>
        </div>
        <div class="form-group">
          <label class="form-label">Nuevo archivo (opcional)</label>
          <input type="file" name="archivo" class="form-control">
          ${t.archivo_nombre ? `<div class="form-hint">Actual: ${Helpers.sanitize(t.archivo_nombre)}</div>` : ''}
        </div>
        <div id="editar-error" class="alert alert-error hidden"></div>
      </form>
    `,
    botones: [
      { texto: 'Cancelar', clase: 'btn-secondary', accion: 'cancelar', onClick: (e,m,c) => c() },
      {
        texto: 'Guardar cambios', clase: 'btn-primary', accion: 'guardar', id: 'btn-guardar-tarea',
        onClick: async (e, modal, cerrar) => {
          const btn = modal.querySelector('#btn-guardar-tarea');
          const form = modal.querySelector('#form-editar-tarea');
          Helpers.setLoading(btn, true);
          try {
            await tareasAPI.actualizar(tarea_id, new FormData(form));
            Toast.success('Tarea actualizada');
            cerrar();
            const container = document.getElementById('page-container');
            renderDetalleClaseProfesor(container, clase_id);
          } catch (err) {
            modal.querySelector('#editar-error').textContent = err.message;
            modal.querySelector('#editar-error').classList.remove('hidden');
            Helpers.setLoading(btn, false, 'Guardar cambios');
          }
        }
      }
    ]
  });
}

async function eliminarTarea(tarea_id, clase_id) {
  const ok = await Modal.confirm('¿Eliminar esta tarea? Se eliminarán todas las entregas asociadas.', 'Eliminar tarea');
  if (!ok) return;
  try {
    await tareasAPI.eliminar(tarea_id);
    Toast.success('Tarea eliminada');
    renderDetalleClaseProfesor(document.getElementById('page-container'), clase_id);
  } catch (err) {
    Toast.error(err.message);
  }
}

// ─── ENTREGAS ──────────────────────────────────────────
async function verEntregasTarea(tarea_id, clase_id) {
  const data = await tareasAPI.obtener(tarea_id);
  const tarea = data.tarea;
  const entregasData = await entregasAPI.deTarea(tarea_id);
  const entregas = entregasData.entregas || [];

  const { modal } = Modal.open({
    titulo: `Entregas: ${tarea.titulo}`,
    tamano: 'modal-xl',
    contenido: `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Estudiante</th><th>Estado</th><th>Fecha entrega</th><th>Archivo</th><th>Calificar</th>
            </tr>
          </thead>
          <tbody>
            ${entregas.map(e => `
              <tr>
                <td>
                  <strong>${Helpers.sanitize(Helpers.getNombreCompleto(e.estudiante))}</strong>
                  <div class="text-xs text-muted">${Helpers.sanitize(e.estudiante?.codigo_estudiantil || '')}</div>
                </td>
                <td>${Helpers.badgeEstadoEntrega(e)}</td>
                <td class="text-sm">${e.fecha_entrega ? Helpers.formatFechaHora(e.fecha_entrega) : '-'}</td>
                <td>
                  ${e.archivo_url
                    ? `<a class="file-link" href="http://localhost:3001${e.archivo_url}" target="_blank" download>
                        📎 ${Helpers.sanitize(e.archivo_nombre || 'Descargar')}
                       </a>`
                    : '<span class="text-muted text-sm">Sin archivo</span>'}
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm"
                    onclick="modalCalificarEntrega('${e.estudiante_id}','${clase_id}','${tarea.tipo}','${Helpers.sanitize(tarea.titulo)}')">
                    Calificar
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  });
}

// ─── CALIFICAR ─────────────────────────────────────────
function modalCalificarEntrega(estudiante_id, clase_id, tipo, titulo_tarea) {
  const tipo_nota = tipo === 'parcial' ? 'parcial' : 'actividad';

  const { modal, cerrar } = Modal.open({
    titulo: `Calificar: ${titulo_tarea}`,
    contenido: `
      <form id="form-calificar">
        <div class="form-group">
          <label class="form-label">Nota (0.0 - 5.0) <span class="required">*</span></label>
          <input type="number" name="valor" class="form-control" min="0" max="5" step="0.1" required
            placeholder="Ej: 4.5" style="font-size:1.3rem;font-family:var(--font-mono)">
        </div>
        <div class="form-group">
          <label class="form-label">Comentario</label>
          <textarea name="comentario" class="form-control" placeholder="Retroalimentación al estudiante..."></textarea>
        </div>
        <div id="cal-error" class="alert alert-error hidden"></div>
      </form>
    `,
    botones: [
      { texto: 'Cancelar', clase: 'btn-secondary', accion: 'cancelar', onClick: (e,m,c) => c() },
      {
        texto: 'Registrar nota', clase: 'btn-primary', accion: 'registrar', id: 'btn-reg-nota',
        onClick: async (e, modal, cerrar) => {
          const btn = modal.querySelector('#btn-reg-nota');
          const form = modal.querySelector('#form-calificar');
          const data = Form.getData(form);
          const val = parseFloat(data.valor);
          if (isNaN(val) || val < 0 || val > 5) {
            modal.querySelector('#cal-error').textContent = 'Nota debe ser entre 0.0 y 5.0';
            modal.querySelector('#cal-error').classList.remove('hidden');
            return;
          }
          Helpers.setLoading(btn, true);
          try {
            await notasAPI.crear({
              estudiante_id, clase_id,
              tipo: tipo_nota,
              valor: val,
              comentario: data.comentario
            });
            Toast.success('Nota registrada. El estudiante será notificado.');
            cerrar();
          } catch (err) {
            modal.querySelector('#cal-error').textContent = err.message;
            modal.querySelector('#cal-error').classList.remove('hidden');
            Helpers.setLoading(btn, false, 'Registrar nota');
          }
        }
      }
    ]
  });
}

// ─── NOTAS ESTUDIANTE EN CLASE ─────────────────────────
async function verNotasEstudiante(clase_id, estudiante_id, nombre) {
  const [notasData, asistenciaData] = await Promise.all([
    notasAPI.deEstudiante(clase_id, estudiante_id),
    asistenciaAPI.deEstudiante(clase_id, estudiante_id)
  ]);

  const notas = notasData.notas || [];
  const promedio = notasData.promedio || 0;
  const asistencia = asistenciaData.estadisticas || {};

  Modal.open({
    titulo: `Notas de ${nombre}`,
    tamano: 'modal-lg',
    contenido: `
      <div style="margin-bottom:16px">
        ${Helpers.renderPromedioDisplay(promedio)}
        ${parseFloat(promedio) <= 2.9 && parseFloat(promedio) > 0
          ? '<div class="badge badge-red mt-2">En riesgo académico</div>' : ''}
      </div>
      <div class="stats-grid" style="margin-bottom:16px">
        <div class="stat-card" style="padding:12px 16px">
          <div><div class="stat-value" style="font-size:1.2rem">${asistencia.presentes || 0}</div><div class="stat-label">Presentes</div></div>
        </div>
        <div class="stat-card" style="padding:12px 16px">
          <div><div class="stat-value" style="font-size:1.2rem">${asistencia.ausentes || 0}</div><div class="stat-label">Ausentes</div></div>
        </div>
        <div class="stat-card" style="padding:12px 16px">
          <div><div class="stat-value" style="font-size:1.2rem">${asistencia.porcentaje || 0}%</div><div class="stat-label">Asistencia</div></div>
        </div>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Descripción</th><th>Tipo</th><th>Nota</th><th>Fecha</th></tr></thead>
          <tbody>
            ${notas.length === 0
              ? '<tr><td colspan="4" class="text-center text-muted">Sin notas registradas</td></tr>'
              : notas.map(n => `
                  <tr>
                    <td>${Helpers.sanitize(n.tarea?.titulo || n.tipo)}</td>
                    <td><span class="badge badge-blue">${n.tipo}</span></td>
                    <td><strong style="font-family:var(--font-mono)">${parseFloat(n.valor).toFixed(1)}</strong></td>
                    <td class="text-xs text-muted">${Helpers.formatFecha(n.created_at)}</td>
                  </tr>
                `).join('')}
          </tbody>
        </table>
      </div>
    `
  });
}

// ─── MIS TAREAS ESTUDIANTE ─────────────────────────────
async function renderMisTareas() {
  Router.setTitle('Mis Tareas');
  const container = document.getElementById('page-container');
  try {
    const matData = await matriculasAPI.misClases();
    const matriculas = matData.matriculas || [];

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Mis Tareas</h1>
      </div>
      <div id="tareas-content"></div>
    `;

    const contenedor = document.getElementById('tareas-content');

    if (matriculas.length === 0) {
      contenedor.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><h3>Sin materias</h3><p>Matricúlate en materias para ver tus tareas.</p></div>';
      return;
    }

    const promesas = matriculas.map(m =>
      tareasAPI.deClase(m.clase.id)
        .then(d => ({ clase: m.clase, tareas: d.tareas || [] }))
        .catch(() => ({ clase: m.clase, tareas: [] }))
    );

    const clasesTareas = await Promise.all(promesas);
    const todasTareas = clasesTareas.flatMap(ct =>
      ct.tareas.map(t => ({ ...t, clase: ct.clase }))
    ).sort((a, b) => {
      if (!a.fecha_limite) return 1;
      if (!b.fecha_limite) return -1;
      return new Date(a.fecha_limite) - new Date(b.fecha_limite);
    });

    contenedor.innerHTML = todasTareas.length === 0
      ? '<div class="empty-state"><div class="empty-icon">📝</div><h3>Sin tareas</h3></div>'
      : todasTareas.map(t => `
          <div class="card mb-4" style="margin-bottom:12px">
            <div class="card-body" style="padding:16px 20px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
                <div style="display:flex;gap:14px;align-items:flex-start">
                  <div class="tarea-tipo-icon" style="${Helpers.colorTarea(t.tipo)}">${Helpers.iconoTarea(t.tipo)}</div>
                  <div>
                    <div class="tarea-title">${Helpers.sanitize(t.titulo)}</div>
                    <div class="tarea-meta">
                      <span>${Helpers.sanitize(t.clase.nombre)}</span>
                      <span>${t.tipo} · ${t.porcentaje}%</span>
                      ${t.fecha_limite ? `<span>${Helpers.fechaVencida(t.fecha_limite) ? '⚠ Venció' : '📅'} ${Helpers.formatFechaHora(t.fecha_limite)}</span>` : ''}
                    </div>
                    ${t.descripcion ? `<p style="font-size:.82rem;color:var(--text-secondary);margin-top:6px">${Helpers.sanitize(t.descripcion)}</p>` : ''}
                    ${t.archivo_url ? `<a class="file-link mt-1" href="http://localhost:3001${t.archivo_url}" target="_blank">📎 ${Helpers.sanitize(t.archivo_nombre)}</a>` : ''}
                  </div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
                  ${Helpers.badgeEstadoEntrega(t.entrega)}
                  ${(!t.entrega && !(t.bloquear_entrega && Helpers.fechaVencida(t.fecha_limite)))
                    ? `<button class="btn btn-primary btn-sm" onclick="modalEntregarTarea('${t.id}','${t.titulo.replace(/'/g,"\\'")}')">Entregar</button>`
                    : (t.entrega ? `<button class="btn btn-secondary btn-sm" onclick="verMiEntrega('${t.entrega.id}','${t.id}')">Ver entrega</button>` : '')
                  }
                </div>
              </div>
            </div>
          </div>
        `).join('');
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function modalEntregarTarea(tarea_id, titulo) {
  const { modal, cerrar } = Modal.open({
    titulo: `Entregar: ${titulo}`,
    contenido: `
      <form id="form-entrega">
        <div class="form-group">
          <label class="form-label">Archivo</label>
          <input type="file" name="archivo" class="form-control">
          <div class="form-hint">Sube tu trabajo. PDF, Word, imágenes, ZIP. Máx. 10MB</div>
        </div>
        <div class="form-group">
          <label class="form-label">Comentario (opcional)</label>
          <textarea name="comentario_estudiante" class="form-control" placeholder="Escribe algo sobre tu entrega..."></textarea>
        </div>
        <input type="hidden" name="tarea_id" value="${tarea_id}">
        <div id="entrega-error" class="alert alert-error hidden"></div>
      </form>
    `,
    botones: [
      { texto: 'Cancelar', clase: 'btn-secondary', accion: 'cancelar', onClick: (e,m,c) => c() },
      {
        texto: 'Entregar', clase: 'btn-primary', accion: 'entregar', id: 'btn-entregar',
        onClick: async (e, modal, cerrar) => {
          const btn = modal.querySelector('#btn-entregar');
          const form = modal.querySelector('#form-entrega');
          Helpers.setLoading(btn, true);
          try {
            await entregasAPI.crear(new FormData(form));
            Toast.success('Entrega realizada correctamente');
            cerrar();
            await renderMisTareas();
          } catch (err) {
            modal.querySelector('#entrega-error').textContent = err.message;
            modal.querySelector('#entrega-error').classList.remove('hidden');
            Helpers.setLoading(btn, false, 'Entregar');
          }
        }
      }
    ]
  });
}
