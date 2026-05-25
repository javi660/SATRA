// =============================================
// SATRA - Asistencia (Profesor)
// =============================================

async function renderAsistenciaProfesor() {
  Router.setTitle('Asistencia');
  const container = document.getElementById('page-container');

  try {
    const clasesData = await clasesAPI.listar();
    const clases = clasesData.clases || [];

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Registro de Asistencia</h1>
      </div>

      <div class="card mb-4" style="margin-bottom:20px">
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Materia</label>
              <select class="form-control" id="sel-clase-asist">
                <option value="">Seleccionar materia</option>
                ${clases.map(c => `<option value="${c.id}">${Helpers.sanitize(c.nombre)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Fecha</label>
              <input type="date" class="form-control" id="fecha-asist" value="${new Date().toISOString().split('T')[0]}">
            </div>
          </div>
          <button class="btn btn-primary" id="btn-cargar-asist">Cargar lista</button>
        </div>
      </div>

      <div id="asist-lista"></div>
    `;

    document.getElementById('btn-cargar-asist')?.addEventListener('click', async () => {
      const clase_id = document.getElementById('sel-clase-asist').value;
      const fecha = document.getElementById('fecha-asist').value;
      if (!clase_id || !fecha) { Toast.warning('Selecciona materia y fecha'); return; }
      await cargarListaAsistencia(clase_id, fecha);
    });
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function cargarListaAsistencia(clase_id, fecha) {
  const contenedor = document.getElementById('asist-lista');
  contenedor.innerHTML = '<div style="text-align:center;padding:20px"><span class="spinner spinner-dark"></span></div>';

  try {
    const [estudiantesData, asistExistente] = await Promise.all([
      clasesAPI.estudiantes(clase_id),
      asistenciaAPI.deClase(clase_id, fecha)
    ]);

    const estudiantes = (estudiantesData.estudiantes || []).map(e => e.estudiante);
    const asistMap = {};
    (asistExistente.asistencia || []).forEach(a => { asistMap[a.estudiante_id] = a.estado; });

    const estadosAsist = {};
    estudiantes.forEach(e => { estadosAsist[e.id] = asistMap[e.id] || null; });

    contenedor.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Lista - ${new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" id="btn-todos-presentes">Todos presentes</button>
            <button class="btn btn-primary" id="btn-guardar-asist">Guardar asistencia</button>
          </div>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Estudiante</th><th>Código</th><th>Estado</th><th>Observación</th></tr></thead>
              <tbody id="tabla-asist">
                ${estudiantes.map(e => `
                  <tr data-id="${e.id}">
                    <td><strong>${Helpers.sanitize(Helpers.getNombreCompleto(e))}</strong></td>
                    <td class="text-xs text-muted">${Helpers.sanitize(e.codigo_estudiantil || '-')}</td>
                    <td>
                      <div class="asistencia-btn-group">
                        ${['presente','ausente','excusa'].map(est => `
                          <button class="btn-asistencia ${estadosAsist[e.id] === est ? 'selected-' + est : ''}"
                            data-estado="${est}" data-est="${e.id}">${est.charAt(0).toUpperCase()+est.slice(1)}</button>
                        `).join('')}
                      </div>
                    </td>
                    <td>
                      <input type="text" class="form-control" style="font-size:.8rem;padding:6px 10px"
                        placeholder="Opcional" data-obs="${e.id}">
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Lógica botones asistencia
    const estadosActuales = { ...estadosAsist };

    contenedor.querySelectorAll('.btn-asistencia').forEach(btn => {
      btn.addEventListener('click', () => {
        const est = btn.dataset.est;
        const estado = btn.dataset.estado;
        estadosActuales[est] = estado;

        // UI
        const row = btn.closest('tr');
        row.querySelectorAll('.btn-asistencia').forEach(b => {
          b.className = `btn-asistencia${b.dataset.estado === estado ? ' selected-' + estado : ''}`;
        });
      });
    });

    // Todos presentes
    document.getElementById('btn-todos-presentes')?.addEventListener('click', () => {
      Object.keys(estadosActuales).forEach(id => { estadosActuales[id] = 'presente'; });
      contenedor.querySelectorAll('.btn-asistencia').forEach(btn => {
        btn.className = `btn-asistencia${btn.dataset.estado === 'presente' ? ' selected-presente' : ''}`;
      });
    });

    // Guardar
    document.getElementById('btn-guardar-asist')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-guardar-asist');
      const registros = estudiantes.map(e => ({
        estudiante_id: e.id,
        estado: estadosActuales[e.id] || 'ausente',
        observacion: contenedor.querySelector(`[data-obs="${e.id}"]`)?.value || ''
      }));

      const sinEstado = registros.filter(r => !r.estado || r.estado === 'ausente' && !estadosActuales[r.estudiante_id]);
      Helpers.setLoading(btn, true);
      try {
        await asistenciaAPI.masiva({ clase_id, fecha, registros });
        Toast.success(`Asistencia guardada para ${registros.length} estudiantes`);
      } catch (err) {
        Toast.error(err.message);
      } finally {
        Helpers.setLoading(btn, false, 'Guardar asistencia');
      }
    });
  } catch (err) {
    contenedor.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ─── MI ASISTENCIA (ESTUDIANTE) ────────────────────────
async function renderMiAsistencia() {
  Router.setTitle('Mi Asistencia');
  const container = document.getElementById('page-container');
  try {
    const matData = await matriculasAPI.misClases();
    const matriculas = matData.matriculas || [];

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Mi Asistencia</h1>
      </div>
      <div class="form-group" style="max-width:300px;margin-bottom:20px">
        <label class="form-label">Materia</label>
        <select class="form-control" id="sel-mi-clase">
          <option value="">Seleccionar materia</option>
          ${matriculas.map(m => `<option value="${m.clase.id}">${Helpers.sanitize(m.clase.nombre)}</option>`).join('')}
        </select>
      </div>
      <div id="mi-asist-contenido"></div>
    `;

    document.getElementById('sel-mi-clase')?.addEventListener('change', async (e) => {
      if (!e.target.value) return;
      const data = await asistenciaAPI.deEstudiante(e.target.value, Auth.getUsuario().id);
      const est = data.estadisticas || {};
      const lista = data.asistencia || [];

      document.getElementById('mi-asist-contenido').innerHTML = `
        <div class="stats-grid mb-4" style="margin-bottom:20px">
          <div class="stat-card"><div class="stat-icon green">✓</div><div><div class="stat-value">${est.presentes||0}</div><div class="stat-label">Presentes</div></div></div>
          <div class="stat-card"><div class="stat-icon red">✕</div><div><div class="stat-value">${est.ausentes||0}</div><div class="stat-label">Ausentes</div></div></div>
          <div class="stat-card"><div class="stat-icon yellow">~</div><div><div class="stat-value">${est.excusas||0}</div><div class="stat-label">Excusas</div></div></div>
          <div class="stat-card"><div class="stat-icon blue">%</div><div><div class="stat-value">${est.porcentaje||0}%</div><div class="stat-label">Asistencia</div></div></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Historial de asistencia</span></div>
          <div class="card-body" style="padding:0">
            <div class="table-wrapper"><table>
              <thead><tr><th>Fecha</th><th>Estado</th><th>Observación</th></tr></thead>
              <tbody>
                ${lista.map(a => `
                  <tr>
                    <td>${Helpers.formatFecha(a.fecha + 'T12:00:00')}</td>
                    <td>${Helpers.badgeAsistencia(a.estado)}</td>
                    <td class="text-sm text-muted">${Helpers.sanitize(a.observacion || '-')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table></div>
          </div>
        </div>
      `;
    });
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ─── MIS NOTAS (ESTUDIANTE) ────────────────────────────
async function renderMisNotas() {
  Router.setTitle('Mis Notas');
  const container = document.getElementById('page-container');
  try {
    const matData = await matriculasAPI.misClases();
    const clases = (matData.matriculas || []).map(m => m.clase).filter(Boolean);
    const usuario = Auth.getUsuario();

    const promesas = clases.map(c =>
      notasAPI.deEstudiante(c.id, usuario.id)
        .then(d => ({ clase: c, notas: d.notas || [], promedio: d.promedio || 0 }))
        .catch(() => ({ clase: c, notas: [], promedio: 0 }))
    );

    const datos = await Promise.all(promesas);

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Mis Notas</h1>
      </div>
      ${datos.map(d => `
        <div class="card" style="margin-bottom:16px">
          <div class="card-header">
            <div>
              <span class="card-title">${Helpers.sanitize(d.clase.nombre)}</span>
              <div class="text-xs text-muted">${Helpers.sanitize(d.clase.codigo)}</div>
            </div>
            <div>${Helpers.renderPromedioDisplay(d.promedio)}</div>
          </div>
          <div class="card-body" style="padding:0">
            ${d.notas.length === 0
              ? '<div class="empty-state" style="padding:24px"><p>Sin notas aún</p></div>'
              : `<div class="table-wrapper"><table>
                  <thead><tr><th>Actividad</th><th>Tipo</th><th>Nota</th><th>Comentario</th></tr></thead>
                  <tbody>
                    ${d.notas.map(n => `
                      <tr>
                        <td>${Helpers.sanitize(n.tarea?.titulo || n.tipo)}</td>
                        <td><span class="badge badge-blue">${n.tipo}</span></td>
                        <td><strong style="font-family:var(--font-mono);font-size:1.1rem">${parseFloat(n.valor).toFixed(1)}</strong></td>
                        <td class="text-sm text-muted">${Helpers.sanitize(n.comentario || '-')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table></div>`
            }
          </div>
        </div>
      `).join('')}
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ─── USUARIOS ADMIN ────────────────────────────────────
async function renderUsuarios() {
  Router.setTitle('Usuarios');
  const container = document.getElementById('page-container');
  try {
    const data = await usuariosAPI.listar();
    const usuarios = data.usuarios || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Gestión de Usuarios</h1>
          <p class="page-subtitle">${usuarios.length} usuarios registrados</p>
        </div>
        <button class="btn btn-primary" id="btn-nuevo-usuario">+ Nuevo usuario</button>
      </div>

      <div class="card mb-4" style="margin-bottom:16px">
        <div class="card-body" style="padding:14px 20px">
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <input type="text" class="form-control" id="buscar-usuario" placeholder="Buscar por nombre o email..." style="flex:1;min-width:200px">
            <select class="form-control" id="filtro-rol" style="width:auto">
              <option value="">Todos los roles</option>
              <option value="estudiante">Estudiantes</option>
              <option value="profesor">Profesores</option>
              <option value="administrador">Administradores</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body" style="padding:0">
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Acciones</th></tr></thead>
              <tbody id="tabla-usuarios">
                ${renderFilasUsuarios(usuarios)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Filtros
    let timeout;
    document.getElementById('buscar-usuario')?.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => filtrarUsuarios(usuarios), 300);
    });
    document.getElementById('filtro-rol')?.addEventListener('change', () => filtrarUsuarios(usuarios));

    document.getElementById('btn-nuevo-usuario')?.addEventListener('click', () => {
      modalUsuarioAdmin(null, () => renderUsuarios());
    });
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function filtrarUsuarios(usuarios) {
  const buscar = document.getElementById('buscar-usuario')?.value.toLowerCase() || '';
  const rol = document.getElementById('filtro-rol')?.value || '';
  const filtrados = usuarios.filter(u =>
    (!buscar || u.nombre.toLowerCase().includes(buscar) || u.apellido.toLowerCase().includes(buscar) || u.email.toLowerCase().includes(buscar)) &&
    (!rol || u.rol === rol)
  );
  document.getElementById('tabla-usuarios').innerHTML = renderFilasUsuarios(filtrados);
}

function renderFilasUsuarios(usuarios) {
  if (!usuarios.length) return '<tr><td colspan="6" class="text-center text-muted" style="padding:24px">Sin resultados</td></tr>';
  return usuarios.map(u => `
    <tr>
      <td><strong>${Helpers.sanitize(`${u.nombre} ${u.apellido}`)}</strong></td>
      <td class="text-sm">${Helpers.sanitize(u.email)}</td>
      <td>${Helpers.badgeRol(u.rol)}</td>
      <td>${u.activo ? '<span class="badge badge-green">Activo</span>' : '<span class="badge badge-gray">Inactivo</span>'}</td>
      <td class="text-xs text-muted">${u.ultimo_acceso ? Helpers.formatTiempoRelativo(u.ultimo_acceso) : 'Nunca'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick='editarUsuarioAdmin(${JSON.stringify(u)})'>Editar</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="gestionarUsuarioAdmin('${u.id}','${Helpers.sanitize(u.nombre + ' ' + u.apellido)}',${u.activo})">
            Gestionar
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function editarUsuarioAdmin(u) {
  modalUsuarioAdmin(u, () => renderUsuarios());
}

function gestionarUsuarioAdmin(id, nombre, activo) {
  const { cerrar } = Modal.open({
    titulo: `Gestionar usuario`,
    contenido: `<p style="color:var(--text-secondary);margin-bottom:8px">
      ¿Qué deseas hacer con <strong>${nombre}</strong>?
    </p>
    <div style="background:var(--bg);border-radius:var(--radius-sm);padding:12px;font-size:.82rem;color:var(--text-muted)">
      <strong>Desactivar:</strong> bloquea el acceso pero conserva todos sus datos.<br>
      <strong>Eliminar:</strong> borra permanentemente al usuario y todos sus registros.
    </div>
    <div id="gestion-error" class="alert alert-error hidden" style="margin-top:12px"></div>`,
    botones: [
      { texto: 'Cancelar', clase: 'btn-secondary', accion: 'cancelar', onClick: (e,m,c) => c() },
      {
        texto: activo ? 'Desactivar' : 'Reactivar', clase: 'btn-secondary', accion: 'desactivar', id: 'btn-desact',
        onClick: async (e, modal, cerrar) => {
          const btn = modal.querySelector('#btn-desact');
          Helpers.setLoading(btn, true);
          try {
            if (activo) {
              await fetch(`http://localhost:3001/api/usuarios/${id}/desactivar`, {
                method: 'PATCH', headers: { Authorization: `Bearer ${Auth.getToken()}` }
              }).then(r => r.json()).then(d => { if (!d.ok) throw new Error(d.error); });
              Toast.success(`${nombre} fue desactivado`);
            } else {
              await usuariosAPI.actualizar(id, { activo: true });
              Toast.success(`${nombre} fue reactivado`);
            }
            cerrar();
            await renderUsuarios();
          } catch (err) {
            modal.querySelector('#gestion-error').textContent = err.message;
            modal.querySelector('#gestion-error').classList.remove('hidden');
            Helpers.setLoading(btn, false, activo ? 'Desactivar' : 'Reactivar');
          }
        }
      },
      {
        texto: 'Eliminar', clase: 'btn-danger', accion: 'eliminar', id: 'btn-elim',
        onClick: async (e, modal, cerrar) => {
          const btn = modal.querySelector('#btn-elim');
          Helpers.setLoading(btn, true);
          try {
            await usuariosAPI.desactivar(id);
            Toast.success(`${nombre} fue eliminado permanentemente`);
            cerrar();
            await renderUsuarios();
          } catch (err) {
            modal.querySelector('#gestion-error').textContent = err.message;
            modal.querySelector('#gestion-error').classList.remove('hidden');
            Helpers.setLoading(btn, false, 'Eliminar');
          }
        }
      }
    ]
  });
}

function modalUsuarioAdmin(usuario, onSuccess) {
  const es_edicion = !!usuario;
  const { modal, cerrar } = Modal.open({
    titulo: es_edicion ? 'Editar usuario' : 'Nuevo usuario',
    contenido: `
      <form id="form-usuario">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nombre <span class="required">*</span></label>
            <input name="nombre" class="form-control" value="${usuario ? Helpers.sanitize(usuario.nombre) : ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Apellido <span class="required">*</span></label>
            <input name="apellido" class="form-control" value="${usuario ? Helpers.sanitize(usuario.apellido) : ''}" required>
          </div>
        </div>
        ${!es_edicion ? `
          <div class="form-group">
            <label class="form-label">Email <span class="required">*</span></label>
            <input name="email" type="email" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label">Contraseña <span class="required">*</span></label>
            <input name="password" type="password" class="form-control" required minlength="8">
          </div>
          <div class="form-group">
            <label class="form-label">Rol <span class="required">*</span></label>
            <select name="rol" class="form-control" required>
              <option value="">Seleccionar</option>
              <option value="estudiante">Estudiante</option>
              <option value="profesor">Profesor</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
        ` : ''}
        <div class="form-group">
          <label class="form-label">Teléfono</label>
          <input name="telefono" class="form-control" value="${usuario?.telefono || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Código estudiantil</label>
          <input name="codigo_estudiantil" class="form-control" value="${usuario?.codigo_estudiantil || ''}">
        </div>
        <div id="usu-error" class="alert alert-error hidden"></div>
      </form>
    `,
    botones: [
      { texto: 'Cancelar', clase: 'btn-secondary', accion: 'cancelar', onClick: (e,m,c) => c() },
      {
        texto: es_edicion ? 'Guardar' : 'Crear', clase: 'btn-primary', accion: 'guardar', id: 'btn-guardar-usu',
        onClick: async (e, modal, cerrar) => {
          const btn = modal.querySelector('#btn-guardar-usu');
          const form = modal.querySelector('#form-usuario');
          const data = Form.getData(form);
          Helpers.setLoading(btn, true);
          try {
            if (es_edicion) await usuariosAPI.actualizar(usuario.id, data);
            else await usuariosAPI.crear(data);
            Toast.success(es_edicion ? 'Usuario actualizado' : 'Usuario creado');
            cerrar();
            if (onSuccess) await onSuccess();
          } catch (err) {
            modal.querySelector('#usu-error').textContent = err.message;
            modal.querySelector('#usu-error').classList.remove('hidden');
            Helpers.setLoading(btn, false, es_edicion ? 'Guardar' : 'Crear');
          }
        }
      }
    ]
  });
}

// ─── MATRÍCULAS ADMIN ──────────────────────────────────
async function renderMatriculasAdmin() {
  Router.setTitle('Matrículas');
  const container = document.getElementById('page-container');
  try {
    const [usuariosData, clasesData] = await Promise.all([
      usuariosAPI.listar({ rol: 'estudiante' }),
      clasesAPI.listar()
    ]);

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Gestión de Matrículas</h1>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Matricular estudiante</span></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Estudiante</label>
              <select class="form-control" id="sel-est-mat">
                <option value="">Seleccionar estudiante</option>
                ${(usuariosData.usuarios||[]).map(u => `<option value="${u.id}">${Helpers.sanitize(Helpers.getNombreCompleto(u))} - ${Helpers.sanitize(u.email)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Materia</label>
              <select class="form-control" id="sel-clase-mat">
                <option value="">Seleccionar materia</option>
                ${(clasesData.clases||[]).filter(c=>c.activa).map(c => `<option value="${c.id}">${Helpers.sanitize(c.nombre)} (${Helpers.sanitize(c.codigo)})</option>`).join('')}
              </select>
            </div>
          </div>
          <button class="btn btn-primary" id="btn-matricular-admin">Matricular</button>
        </div>
      </div>
    `;

    document.getElementById('btn-matricular-admin')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-matricular-admin');
      const est = document.getElementById('sel-est-mat').value;
      const clase = document.getElementById('sel-clase-mat').value;
      if (!est || !clase) { Toast.warning('Selecciona estudiante y materia'); return; }
      Helpers.setLoading(btn, true);
      try {
        await matriculasAPI.matricularEstudiante({ estudiante_id: est, clase_id: clase });
        Toast.success('Estudiante matriculado correctamente');
      } catch (err) {
        Toast.error(err.message);
      } finally {
        Helpers.setLoading(btn, false, 'Matricular');
      }
    });
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ─── ALERTAS ACADÉMICAS ────────────────────────────────
async function renderAlertas() {
  Router.setTitle('Alertas Académicas');
  const container = document.getElementById('page-container');
  try {
    const { supabase: sb } = await Promise.resolve({ supabase: null });

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Alertas Académicas</h1>
        <p class="page-subtitle">Estudiantes con promedio ≤ 2.9</p>
      </div>
      <div style="text-align:center;padding:40px">
        <div class="spinner spinner-dark"></div>
      </div>
    `;

    // Una sola petición para obtener clases
    const { clases = [] } = await clasesAPI.listar();

    // Paralelo: obtener estudiantes de todas las clases a la vez
    const estudiantesPorClase = await Promise.all(
      clases.map(clase =>
        clasesAPI.estudiantes(clase.id)
          .then(d => ({ clase, estudiantes: (d.estudiantes || []).map(e => e.estudiante) }))
          .catch(() => ({ clase, estudiantes: [] }))
      )
    );

    // Paralelo: obtener notas de todos los estudiantes a la vez (cap 20 concurrentes)
    const pares = estudiantesPorClase.flatMap(({ clase, estudiantes }) =>
      estudiantes.map(est => ({ clase, est }))
    );

    const BATCH = 20;
    const alertas = [];
    for (let i = 0; i < pares.length; i += BATCH) {
      const lote = pares.slice(i, i + BATCH);
      const resultados = await Promise.all(
        lote.map(({ clase, est }) =>
          notasAPI.deEstudiante(clase.id, est.id)
            .then(d => ({ clase, est, promedio: parseFloat(d.promedio || 0) }))
            .catch(() => null)
        )
      );
      resultados.forEach(r => {
        if (r && r.promedio > 0 && r.promedio <= 2.9) {
          alertas.push({ estudiante: r.est, clase: r.clase, promedio: r.promedio });
        }
      });
    }

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Alertas Académicas</h1>
        <p class="page-subtitle">${alertas.length} estudiante(s) en riesgo académico</p>
      </div>
      ${alertas.length === 0
        ? '<div class="empty-state"><div class="empty-icon">✓</div><h3>Sin alertas</h3><p>Ningún estudiante está en riesgo académico actualmente.</p></div>'
        : `<div class="card">
            <div class="card-body" style="padding:0">
              <div class="table-wrapper"><table>
                <thead><tr><th>Estudiante</th><th>Materia</th><th>Promedio</th><th>Estado</th></tr></thead>
                <tbody>
                  ${alertas.map(a => `
                    <tr>
                      <td>
                        <strong>${Helpers.sanitize(Helpers.getNombreCompleto(a.estudiante))}</strong>
                        <div class="text-xs text-muted">${Helpers.sanitize(a.estudiante.email || '')}</div>
                      </td>
                      <td>${Helpers.sanitize(a.clase.nombre)}</td>
                      <td>${Helpers.renderPromedioDisplay(a.promedio)}</td>
                      <td><span class="badge badge-red">En riesgo</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table></div>
            </div>
          </div>`
      }
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ─── CONFIGURACIÓN ─────────────────────────────────────
async function renderConfiguracion() {
  Router.setTitle('Configuración');
  const container = document.getElementById('page-container');
  const usuario = Auth.getUsuario();

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Configuración</h1>
    </div>

    <div style="max-width:560px;display:flex;flex-direction:column;gap:20px">

      <div class="card">
        <div class="card-header"><span class="card-title">Apariencia</span></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Tema</label>
            <div style="display:flex;gap:12px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 16px;border:2px solid var(--border);border-radius:var(--radius-sm)" id="btn-tema-claro">
                <input type="radio" name="tema" value="claro" ${usuario.tema !== 'oscuro' ? 'checked' : ''}> ☀ Modo claro
              </label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 16px;border:2px solid var(--border);border-radius:var(--radius-sm)" id="btn-tema-oscuro">
                <input type="radio" name="tema" value="oscuro" ${usuario.tema === 'oscuro' ? 'checked' : ''}> 🌙 Modo oscuro
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Tamaño de texto</label>
            <select class="form-control" id="sel-tamano" style="max-width:200px">
              <option value="pequeno" ${usuario.tamano_texto === 'pequeno' ? 'selected' : ''}>Pequeño</option>
              <option value="normal" ${!usuario.tamano_texto || usuario.tamano_texto === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="grande" ${usuario.tamano_texto === 'grande' ? 'selected' : ''}>Grande</option>
            </select>
          </div>
          <button class="btn btn-primary" id="btn-guardar-apariencia">Guardar preferencias</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Cambiar contraseña</span></div>
        <div class="card-body">
          <form id="form-cambiar-pass">
            <div class="form-group">
              <label class="form-label">Contraseña actual</label>
              <input type="password" name="password_actual" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">Nueva contraseña</label>
              <input type="password" name="nueva_password" class="form-control" required minlength="8">
            </div>
            <div id="pass-error" class="alert alert-error hidden"></div>
            <button type="submit" class="btn btn-primary" id="btn-cambiar-pass">Cambiar contraseña</button>
          </form>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Sesión</span></div>
        <div class="card-body">
          <p class="text-muted mb-4" style="margin-bottom:12px">¿Deseas cerrar sesión en este dispositivo?</p>
          <button class="btn btn-danger" onclick="if(confirm('¿Cerrar sesión?')) Auth.logout()">Cerrar sesión</button>
        </div>
      </div>
    </div>
  `;

  // Apariencia
  document.querySelectorAll('input[name="tema"]').forEach(radio => {
    radio.addEventListener('change', () => {
      Auth.aplicarTema(radio.value);
    });
  });

  document.getElementById('sel-tamano')?.addEventListener('change', (e) => {
    Auth.aplicarTamanoTexto(e.target.value);
  });

  document.getElementById('btn-guardar-apariencia')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-guardar-apariencia');
    const tema = document.querySelector('input[name="tema"]:checked')?.value || 'claro';
    const tamano_texto = document.getElementById('sel-tamano')?.value || 'normal';
    Helpers.setLoading(btn, true);
    try {
      await authAPI.configuracion({ tema, tamano_texto });
      Auth.updateUsuario({ tema, tamano_texto });
      Toast.success('Preferencias guardadas');
    } catch (err) {
      Toast.error(err.message);
    } finally {
      Helpers.setLoading(btn, false, 'Guardar preferencias');
    }
  });

  // Cambiar password
  document.getElementById('form-cambiar-pass')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-cambiar-pass');
    const errEl = document.getElementById('pass-error');
    Helpers.setLoading(btn, true);
    errEl.classList.add('hidden');
    try {
      await authAPI.cambiarPassword({
        password_actual: e.target.password_actual.value,
        nueva_password: e.target.nueva_password.value
      });
      Toast.success('Contraseña actualizada correctamente');
      e.target.reset();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    } finally {
      Helpers.setLoading(btn, false, 'Cambiar contraseña');
    }
  });
}
