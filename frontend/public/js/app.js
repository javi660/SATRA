// =============================================
// SATRA - App Bootstrap
// =============================================

async function iniciarApp() {
  // Montar layout
  Router.montarLayout();

  // Conectar tiempo real
  EventosRT.connect();

  // Inicializar notificaciones
  await Notificaciones.init();

  // Actualizar notificaciones cada 60s
  setInterval(() => Notificaciones.cargarPendientes(), 60000);

  // Registrar todas las rutas
  registrarRutas();

  // Navegar a última página del usuario
  const ultimaPagina = Auth.getUltimaPagina();
  await Router.navegar(ultimaPagina, false);

  // Guardar página en cada visibilidad (cierre accidental)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && Router.getRutaActual()) {
      Auth.guardarPagina(Router.getRutaActual());
    }
  });
}

function registrarRutas() {
  Router.registrar('/dashboard', renderDashboard);

  // Estudiante
  Router.registrar('/mis-clases', Auth.isEstudiante() ? renderMisClases : (Auth.isProfesor() ? renderMisClases : renderClasesAdmin));
  Router.registrar('/mis-tareas', renderMisTareas);
  Router.registrar('/mis-notas', renderMisNotas);
  Router.registrar('/mi-asistencia', renderMiAsistencia);

  // Profesor
  Router.registrar('/tareas-profesor', renderMisTareasProfesor);
  Router.registrar('/calificaciones', renderCalificacionesProfesor);
  Router.registrar('/asistencia-profesor', renderAsistenciaProfesor);

  // Admin
  Router.registrar('/usuarios', renderUsuarios);
  Router.registrar('/clases-admin', renderClasesAdmin);
  Router.registrar('/matriculas-admin', renderMatriculasAdmin);

  // Compartidas
  Router.registrar('/alertas', renderAlertas);
  Router.registrar('/configuracion', renderConfiguracion);
}

// ─── VISTAS ADICIONALES DE PROFESOR ───────────────────
async function renderMisTareasProfesor() {
  Router.setTitle('Tareas');
  const container = document.getElementById('page-container');
  try {
    const clasesData = await clasesAPI.listar();
    const clases = clasesData.clases || [];

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Gestión de Tareas</h1>
      </div>
      <div class="form-group" style="max-width:320px;margin-bottom:20px">
        <label class="form-label">Seleccionar materia</label>
        <select class="form-control" id="sel-clase-tarea">
          <option value="">Seleccionar materia</option>
          ${clases.map(c => `<option value="${c.id}">${Helpers.sanitize(c.nombre)}</option>`).join('')}
        </select>
      </div>
      <div id="tareas-clase-contenido"></div>
    `;

    document.getElementById('sel-clase-tarea')?.addEventListener('change', async (e) => {
      const clase_id = e.target.value;
      if (!clase_id) return;
      const cnt = document.getElementById('tareas-clase-contenido');
      cnt.innerHTML = '<div style="text-align:center;padding:20px"><span class="spinner spinner-dark"></span></div>';

      const data = await tareasAPI.deClase(clase_id);
      const tareas = data.tareas || [];

      cnt.innerHTML = `
        <div class="card">
          <div class="card-header">
            <span class="card-title">Tareas (${tareas.length})</span>
            <button class="btn btn-primary btn-sm" onclick="modalCrearTarea('${clase_id}', () => document.getElementById('sel-clase-tarea').dispatchEvent(new Event('change')))">+ Nueva tarea</button>
          </div>
          <div class="card-body" style="padding:0">
            ${tareas.length === 0
              ? '<div class="empty-state" style="padding:32px"><p>Sin tareas. Crea la primera.</p></div>'
              : tareas.map(t => `
                  <div class="tarea-item" style="padding:14px 20px">
                    <div class="tarea-tipo-icon" style="${Helpers.colorTarea(t.tipo)}">${Helpers.iconoTarea(t.tipo)}</div>
                    <div class="tarea-info">
                      <div class="tarea-title">${Helpers.sanitize(t.titulo)}</div>
                      <div class="tarea-meta">
                        <span>${t.tipo} · ${t.porcentaje}%</span>
                        ${t.fecha_limite ? `<span>Límite: ${Helpers.formatFechaHora(t.fecha_limite)}</span>` : ''}
                        ${t.bloquear_entrega ? '<span class="badge badge-yellow" style="font-size:.7rem">Bloqueada</span>' : ''}
                      </div>
                    </div>
                    <div style="display:flex;gap:6px">
                      <button class="btn btn-secondary btn-sm" onclick="verEntregasTarea('${t.id}','${clase_id}')">Ver entregas</button>
                      <button class="btn btn-ghost btn-sm" onclick="editarTarea('${t.id}','${clase_id}')">✎</button>
                      <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="eliminarTarea('${t.id}','${clase_id}')">✕</button>
                    </div>
                  </div>
                `).join('')}
          </div>
        </div>
      `;
    });
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function renderCalificacionesProfesor() {
  Router.setTitle('Calificaciones');
  const container = document.getElementById('page-container');
  try {
    const clasesData = await clasesAPI.listar();
    const clases = clasesData.clases || [];

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Calificaciones</h1>
      </div>
      <div class="form-group" style="max-width:320px;margin-bottom:20px">
        <label class="form-label">Seleccionar materia</label>
        <select class="form-control" id="sel-clase-cal">
          <option value="">Seleccionar materia</option>
          ${clases.map(c => `<option value="${c.id}">${Helpers.sanitize(c.nombre)}</option>`).join('')}
        </select>
      </div>
      <div id="cal-contenido"></div>
    `;

    document.getElementById('sel-clase-cal')?.addEventListener('change', async (e) => {
      const clase_id = e.target.value;
      if (!clase_id) return;
      const cnt = document.getElementById('cal-contenido');
      cnt.innerHTML = '<div style="text-align:center;padding:20px"><span class="spinner spinner-dark"></span></div>';

      const data = await notasAPI.deClase(clase_id);
      const estudiantes = data.estudiantes || [];

      cnt.innerHTML = `
        <div class="card">
          <div class="card-header"><span class="card-title">Promedios por estudiante</span></div>
          <div class="card-body" style="padding:0">
            <div class="table-wrapper"><table>
              <thead><tr><th>Estudiante</th><th>Código</th><th>Promedio</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                ${estudiantes.length === 0
                  ? '<tr><td colspan="5" class="text-center text-muted" style="padding:24px">Sin estudiantes matriculados</td></tr>'
                  : estudiantes.map(e => `
                      <tr>
                        <td><strong>${Helpers.sanitize(`${e.nombre} ${e.apellido}`)}</strong></td>
                        <td class="text-xs text-muted">${Helpers.sanitize(e.codigo_estudiantil || '-')}</td>
                        <td>${Helpers.renderPromedioDisplay(e.promedio)}</td>
                        <td>
                          ${parseFloat(e.promedio) === 0
                            ? '<span class="badge badge-gray">Sin notas</span>'
                            : parseFloat(e.promedio) <= 2.9
                              ? '<span class="badge badge-red">En riesgo</span>'
                              : '<span class="badge badge-green">Aprobado</span>'}
                        </td>
                        <td>
                          <button class="btn btn-secondary btn-sm" onclick="verNotasEstudiante('${clase_id}','${e.id}','${Helpers.sanitize(`${e.nombre} ${e.apellido}`)}')">
                            Ver notas
                          </button>
                        </td>
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

// ─── INICIALIZAR ───────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // Aplicar tema guardado antes de cualquier render
  const raw = localStorage.getItem('satra_usuario');
  if (raw) {
    try {
      const u = JSON.parse(raw);
      Auth.aplicarTema(u.tema);
      Auth.aplicarTamanoTexto(u.tamano_texto);
    } catch {}
  }

  if (!Auth.isLoggedIn()) {
    // Crear contenedor de login
    document.body.innerHTML = '<div id="login-root"></div>';
    renderLogin();
    return;
  }

  // Verificar sesión con servidor
  const sesionValida = await Auth.verificarSesion();
  if (!sesionValida) return; // logout ya fue llamado

  await iniciarApp();
});
