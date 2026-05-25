// =============================================
// SATRA - Dashboard
// =============================================

async function renderDashboard() {
  Router.setTitle('Inicio');
  const container = document.getElementById('page-container');
  const usuario = Auth.getUsuario();

  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:200px"><span class="spinner spinner-dark"></span></div>`;

  if (Auth.isEstudiante()) {
    await renderDashboardEstudiante(container);
  } else if (Auth.isProfesor()) {
    await renderDashboardProfesor(container);
  } else {
    await renderDashboardAdmin(container);
  }
}

async function renderDashboardEstudiante(container) {
  const usuario = Auth.getUsuario();
  try {
    const [matData] = await Promise.all([
      matriculasAPI.misClases()
    ]);

    const clases = (matData.matriculas || []).map(m => m.clase).filter(Boolean);

    // Calcular notas por clase
    const promisesNotas = clases.map(c =>
      notasAPI.deEstudiante(c.id, usuario.id)
        .then(d => ({ clase: c, promedio: d.promedio || 0, notas: d.notas || [] }))
        .catch(() => ({ clase: c, promedio: 0, notas: [] }))
    );

    const notasPorClase = await Promise.all(promisesNotas);
    const promedioGlobal = notasPorClase.length > 0
      ? notasPorClase.reduce((s, n) => s + parseFloat(n.promedio), 0) / notasPorClase.length
      : 0;

    const enRiesgo = notasPorClase.filter(n => parseFloat(n.promedio) > 0 && parseFloat(n.promedio) <= 2.9);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Bienvenido, ${Helpers.sanitize(usuario.nombre)}</h1>
          <p class="page-subtitle">Revisa tu progreso académico</p>
        </div>
      </div>

      ${enRiesgo.length > 0 ? `
        <div class="alerta-riesgo mb-4">
          <strong>⚠ Alerta Académica</strong>
          <p style="margin-top:4px;font-size:.875rem">
            Tienes ${enRiesgo.length} materia(s) con promedio en riesgo (≤ 2.9):
            <strong>${enRiesgo.map(n => n.clase.nombre).join(', ')}</strong>.
            Comunícate con tu docente a la brevedad.
          </p>
        </div>
      ` : ''}

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">📚</div>
          <div>
            <div class="stat-value">${clases.length}</div>
            <div class="stat-label">Materias activas</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon ${parseFloat(promedioGlobal.toFixed(2)) <= 2.9 ? 'red' : 'green'}">🎯</div>
          <div>
            <div class="stat-value">${promedioGlobal.toFixed(2)}</div>
            <div class="stat-label">Promedio global</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon ${enRiesgo.length > 0 ? 'red' : 'green'}">${enRiesgo.length > 0 ? '⚠' : '✓'}</div>
          <div>
            <div class="stat-value">${enRiesgo.length}</div>
            <div class="stat-label">En riesgo académico</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Mis Materias y Promedios</span>
          <button class="btn btn-primary btn-sm" onclick="Router.navegar('/mis-clases')">Ver todas</button>
        </div>
        <div class="card-body" style="padding:0">
          ${notasPorClase.length === 0
            ? '<div class="empty-state"><div class="empty-icon">📚</div><h3>Sin materias</h3><p>Aún no estás matriculado en ninguna materia.</p></div>'
            : `<div class="table-wrapper"><table>
                <thead><tr>
                  <th>Materia</th><th>Código</th><th>Promedio</th><th>Estado</th>
                </tr></thead>
                <tbody>
                  ${notasPorClase.map(n => `
                    <tr>
                      <td><strong>${Helpers.sanitize(n.clase.nombre)}</strong></td>
                      <td><span class="font-mono text-xs" style="font-family:var(--font-mono)">${Helpers.sanitize(n.clase.codigo)}</span></td>
                      <td>${Helpers.renderPromedioDisplay(n.promedio)}</td>
                      <td>
                        ${parseFloat(n.promedio) === 0
                          ? '<span class="badge badge-gray">Sin notas</span>'
                          : parseFloat(n.promedio) <= 2.9
                            ? '<span class="badge badge-red">En riesgo</span>'
                            : '<span class="badge badge-green">Aprobado</span>'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table></div>`
          }
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Error al cargar el dashboard: ${err.message}</div>`;
  }
}

async function renderDashboardProfesor(container) {
  try {
    const clasesData = await clasesAPI.listar();
    const clases = clasesData.clases || [];

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Panel del Profesor</h1>
          <p class="page-subtitle">Gestión académica de tus materias</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">📚</div>
          <div><div class="stat-value">${clases.length}</div><div class="stat-label">Materias asignadas</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Mis Materias</span>
          <button class="btn btn-primary btn-sm" onclick="Router.navegar('/mis-clases')">Gestionar</button>
        </div>
        <div class="card-body" style="padding:0">
          ${clases.length === 0
            ? '<div class="empty-state"><div class="empty-icon">📚</div><h3>Sin materias asignadas</h3></div>'
            : `<div class="table-wrapper"><table>
                <thead><tr><th>Materia</th><th>Código</th><th>Semestre</th><th>Acciones</th></tr></thead>
                <tbody>
                  ${clases.map(c => `
                    <tr>
                      <td><strong>${Helpers.sanitize(c.nombre)}</strong></td>
                      <td style="font-family:var(--font-mono);font-size:.8rem">${Helpers.sanitize(c.codigo)}</td>
                      <td>${Helpers.sanitize(c.semestre || '-')}</td>
                      <td>
                        <button class="btn btn-secondary btn-sm" onclick="verClase('${c.id}')">Ver clase</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table></div>`
          }
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function renderDashboardAdmin(container) {
  try {
    const [usuariosData, clasesData] = await Promise.all([
      usuariosAPI.listar(),
      clasesAPI.listar()
    ]);

    const usuarios = usuariosData.usuarios || [];
    const clases = clasesData.clases || [];
    const estudiantes = usuarios.filter(u => u.rol === 'estudiante').length;
    const profesores = usuarios.filter(u => u.rol === 'profesor').length;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Panel Administrador</h1>
          <p class="page-subtitle">Vista general del sistema SATRA</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">👥</div>
          <div><div class="stat-value">${usuarios.length}</div><div class="stat-label">Usuarios registrados</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">🎓</div>
          <div><div class="stat-value">${estudiantes}</div><div class="stat-label">Estudiantes</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow">👨‍🏫</div>
          <div><div class="stat-value">${profesores}</div><div class="stat-label">Profesores</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">📚</div>
          <div><div class="stat-value">${clases.length}</div><div class="stat-label">Materias activas</div></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Acciones rápidas</span>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-secondary w-full" onclick="Router.navegar('/usuarios')">Gestionar Usuarios</button>
            <button class="btn btn-secondary w-full" onclick="Router.navegar('/clases-admin')">Gestionar Clases</button>
            <button class="btn btn-secondary w-full" onclick="Router.navegar('/matriculas-admin')">Gestionar Matrículas</button>
            <button class="btn btn-secondary w-full" onclick="Router.navegar('/alertas')">Ver Alertas Académicas</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Últimas materias</span>
          </div>
          <div class="card-body" style="padding:0">
            <div class="table-wrapper"><table>
              <thead><tr><th>Materia</th><th>Profesor</th><th>Estado</th></tr></thead>
              <tbody>
                ${clases.slice(0, 6).map(c => `
                  <tr>
                    <td><strong>${Helpers.sanitize(c.nombre)}</strong></td>
                    <td class="text-sm text-muted">${c.profesor ? Helpers.getNombreCompleto(c.profesor) : 'Sin asignar'}</td>
                    <td>${c.activa ? '<span class="badge badge-green">Activa</span>' : '<span class="badge badge-gray">Inactiva</span>'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table></div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function verClase(id) {
  sessionStorage.setItem('clase_actual', id);
  Router.navegar('/mis-clases');
}
